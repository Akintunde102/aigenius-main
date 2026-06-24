'use client';
import { Empty } from "antd";
import { CloudFile } from "./file.interface";
import Gallery from "./Gallery";
import { consideredImageExtensions } from "@/lib/gen";



export const ImageFileTemplate = ({ uploadedFiles }: {
    uploadedFiles: CloudFile[]
}) => {


    if (uploadedFiles.length < 1) {
        return (
            <>
                <br /><br /><br /><br />
                <Empty
                    description={
                        <span>
                            You have no Image files
                        </span>
                    }
                />
            </>
        )
    }

    const images = uploadedFiles
        .map((file, i) => {
            const { name } = file;

            const extension = name.split('.').pop();

            if (!extension) return null;

            if (!consideredImageExtensions.includes(extension)) {
                return null;
            }

            return file;
        }).filter((file) => file !== null);


    return (
        <Gallery images={images as CloudFile[]} />
    )
}

