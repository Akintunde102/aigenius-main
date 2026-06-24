"use client";
import React from "react";
import Box from "@/app/components/Box";

interface RecordSpaceCardProps { recordSpace: any, projectId: string, recordCount: number; }

export const RecordSpaceCard = ({ recordSpace, projectId, recordCount }: RecordSpaceCardProps) => {
    const { name, id, slug: recordSpaceSlug, description } = recordSpace;

    const link = `/records/${projectId}/${recordSpaceSlug}`;
    return (
        <Box
            id={id}
            key={id}
            link={link}
            title={name}
            subTitle={description}
            bottomTitle={`${recordCount === 1 ? '1 record' : `${recordCount} records`}`}
        />
    )
}
