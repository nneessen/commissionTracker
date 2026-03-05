import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CampaignWizard } from "./CampaignWizard";
import { consumeCampaignPrefill } from "../../utils/campaign-prefill";

interface CampaignEditorPageProps {
  editCampaignId?: string;
  prefillKey?: string;
}

export function CampaignEditorPage({
  editCampaignId,
  prefillKey,
}: CampaignEditorPageProps) {
  const navigate = useNavigate();
  const [prefill] = useState(() => consumeCampaignPrefill(prefillKey));

  function handleClose() {
    navigate({ to: "/marketing/campaigns" });
  }

  return (
    <div className="flex h-full flex-col p-4">
      <div className="mb-2 flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1 px-2 text-xs"
          onClick={handleClose}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Campaigns
        </Button>
      </div>

      <div className="flex-1 min-h-0">
        <CampaignWizard
          onClose={handleClose}
          editCampaignId={editCampaignId}
          initialBlocks={!editCampaignId ? prefill?.blocks : undefined}
          initialSubject={!editCampaignId ? prefill?.subject : undefined}
        />
      </div>
    </div>
  );
}
