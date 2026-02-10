// src/features/training-modules/hooks/useTextToSpeech.ts
import { useState, useRef, useCallback, useEffect } from "react";
// eslint-disable-next-line no-restricted-imports
import { supabase } from "@/services/base/supabase";

type TtsState = "idle" | "loading" | "playing" | "paused";

/**
 * Hook to manage text-to-speech playback via the ElevenLabs edge function.
 * Caches the audio blob in memory so repeated plays don't re-fetch.
 */
export function useTextToSpeech(text: string) {
  const [state, setState] = useState<TtsState>("idle");
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const textRef = useRef(text);

  // Invalidate cache when text changes
  useEffect(() => {
    if (textRef.current !== text) {
      textRef.current = text;
      // Stop and clean up cached audio for previous text
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
      setState("idle");
    }
  }, [text]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  const play = useCallback(async () => {
    setError(null);

    // If we already have audio cached, just play it
    if (blobUrlRef.current && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      setState("playing");
      return;
    }

    // Fetch from edge function
    setState("loading");
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        "text-to-speech",
        {
          body: { text },
          // We need the raw response for audio binary
        },
      );

      if (fnError) {
        throw new Error(fnError.message || "TTS request failed");
      }

      // data will be a Blob or we need to handle it
      let blob: Blob;
      if (data instanceof Blob) {
        blob = data;
      } else if (data instanceof ArrayBuffer) {
        blob = new Blob([data], { type: "audio/mpeg" });
      } else {
        // If the function returned an error object
        const errorMsg = typeof data === "object" && data?.error ? data.error : "Unexpected response";
        throw new Error(errorMsg);
      }

      const url = URL.createObjectURL(blob);
      blobUrlRef.current = url;

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => setState("idle");
      audio.onerror = () => {
        setState("idle");
        setError("Audio playback failed");
      };

      audio.play();
      setState("playing");
    } catch (err) {
      setState("idle");
      setError(err instanceof Error ? err.message : "TTS failed");
    }
  }, [text]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState("paused");
    }
  }, []);

  const resume = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.play();
      setState("playing");
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setState("idle");
    }
  }, []);

  return { state, error, play, pause, resume, stop };
}
