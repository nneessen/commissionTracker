import React from "react";
import { render, screen } from "@testing-library/react";
import App from "./App";

test("renders the standard hq header", () => {
  render(<App />);
  const headerElement = screen.getByText(/the standard hq/i);
  expect(headerElement).toBeInTheDocument();
});

test("renders add expense button", () => {
  render(<App />);
  const addButton = screen.getByText(/add expense/i);
  expect(addButton).toBeInTheDocument();
});

test("renders expense sections", () => {
  render(<App />);
  const personalSection = screen.getByText(/personal expenses/i);
  const businessSection = screen.getByText(/business expenses/i);
  const debtSection = screen.getByText(/monthly debt payments/i);

  expect(personalSection).toBeInTheDocument();
  expect(businessSection).toBeInTheDocument();
  expect(debtSection).toBeInTheDocument();
});
