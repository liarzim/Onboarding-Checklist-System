"use client";

import React from "react";
import IdCardUploadCard from "./IdCardUploadCard";
import PassportPhotoUploadCard from "./PassportPhotoUploadCard";

interface MediaUploadCardProps {
  docTypeId: "doc_10" | "doc_11";
  candidate: {
    candidate_id: string;
    full_name: string;
    id_number: string;
    vendor_company_name?: string;
  };
  token?: string; // If candidate portal
  initialUploadedFiles?: Array<{
    name: string;
    url?: string | null;
  }>;
  onUploaded?: (docTypeId: string) => void;
  onNavigateNext?: () => void;
  nextDocTypeId?: string | null;
}

export default function MediaUploadCard(props: MediaUploadCardProps) {
  if (props.docTypeId === "doc_11") {
    return <PassportPhotoUploadCard {...props} />;
  }
  return <IdCardUploadCard {...props} />;
}
