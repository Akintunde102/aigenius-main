'use client';
import { Empty } from "antd";
import useFileContext from "./FileContext";
import { CloudFile } from "./file.interface";
import { timeAgo } from "@/lib/time-ago";
import { useState } from "react";
import { useRouter } from "next/navigation";


export const FileTemplate = ({ uploadedFiles }: {
    uploadedFiles: CloudFile[]
}) => {

    const { copyLink } = useFileContext();

    const [chosenFileId, setChosenFileId] = useState<string>();


    if (uploadedFiles.length < 1) {
        return (
            <>
                <br /><br /><br /><br />
                <Empty
                    description={
                        <span>
                            You have no files
                        </span>
                    }
                />
            </>
        )
    }

    return (
        <section>
            <div>
                <span className='title mt-24 pb-3 text-lg text-stone-600'>
                    Your Files
                </span>
                <span className="text-[10px]">
                    &nbsp; &nbsp; &nbsp; (Click File to Copy link)
                </span>
            </div>
            {
                uploadedFiles.map((file, i) => {
                    return <EachFile file={file} setChosenFileId={setChosenFileId} chosenFileId={chosenFileId} key={i} />
                })
            }
        </section>
    )
}

const EachFile = ({ file, setChosenFileId, chosenFileId }: {
    file: CloudFile,
    setChosenFileId: (id: string) => void
    chosenFileId: string | undefined
}) => {

    const { copyLink } = useFileContext();

    const { s3Link: link, name, originalName, createdAt, id, fileSizeInBytes } = file;

    const extension = name.split('.').pop();

    const router = useRouter();


    return (
        <div
            onClick={() => {
                setChosenFileId(id)
                copyLink(link, originalName)
                router.push(`/upload/${id}`);
            }}
            className={`flex justify-between bg-[#FFF] hover:bg-[#D9D8FF] p-[20px] my-[5px] cursor-pointer  ${chosenFileId === id ? " border-cyan-950 border-x-4" : "border-[#D9D8FF] border-y-1"}`}
            style={{ maxWidth: "100%" }}
        >
            <div className="text-[14px] py-[2px] text-left w-[30%]">
                {originalName}.{extension}
            </div>
            <div className="text-[14px] py-[2px] w-[30%]">
                {fileSizeInBytes && fileSizeInBytes > 0 ? `${(fileSizeInBytes / 1024).toFixed(2)} KB` : ""}
            </div>
            <div className="text-[14px] py-[2px] w-[10%]">
                {timeAgo(createdAt)}
            </div>
        </div>
    )
}