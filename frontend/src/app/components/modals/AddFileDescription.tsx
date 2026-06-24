import { transparentButton } from "@/lib/tailwind-classes";
import { useEffect, useRef, useState } from "react";
import { authHttp } from "@/lib/api/auth-client";
import { addFileDescriptionUrl } from "../file/constants";
import { CloudFile } from "../file/file.interface";

const AddFileDescription = ({ closeModal, fileId, onSuccessfulUpload }: {
    closeModal: () => void
    fileId: string
    onSuccessfulUpload: (file: CloudFile) => void
}) => {

    const [description, setDescription] = useState<string>("");

    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textAreaRef.current) {
            textAreaRef.current.focus();
        }
    }, []);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        try {
            const data = {
                description,
                fileId
            }
            const res = await authHttp.post(`${addFileDescriptionUrl(fileId)}`, data);

            if (res.status.toString().startsWith("2")) {
                onSuccessfulUpload(res.data);
                closeModal();
            }
        } catch (error) {
            // Error adding file description
        }
    };

    return (
        <div className="w-full py-[30px] px-[5px]">
            <form onSubmit={handleSubmit}>
                <div className="py-[10px] px-[5px] w-full">
                    <div style={{ textAlign: "center" }} className="text-[#292D32] text-[14px] font-bold">
                        <span> Add Your thoughts and comments</span>

                    </div>
                    <div className='flex my-2 flex-col'>
                        <textarea
                            ref={textAreaRef}
                            className="w-full p-2 border-2 border-solid border-[#ced2f2] rounded-sm"
                            name="description"
                            placeholder="..."
                            value={description}
                            style={{ height: "150px", fontSize: "16px" }}
                            onChange={(event) => setDescription(event.currentTarget.value)}
                        />
                        <div className="flex justify-center my-4">
                            <button
                                style={{ marginLeft: 10 }}
                                className={transparentButton()}
                            >
                                Add Comments
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>

    );
}

export default AddFileDescription;
