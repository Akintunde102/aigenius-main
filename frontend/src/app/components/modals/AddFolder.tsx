import { transparentButton } from "@/lib/tailwind-classes";
import { useEffect, useRef, useState } from "react";
import { authHttp } from "@/lib/api/auth-client";
import { addFolderUrl } from "../file/constants";

const AddFolder = ({ closeModal, afterAddingFolders }: {
    closeModal: () => void;
    afterAddingFolders: () => void;
}) => {
    const [name, setName] = useState<string>("");
    const [description, setDescription] = useState<string>("");
    const [tags, setTags] = useState<string>("");

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
                name,
                description,
                tags: tags.split(",").map(tag => tag.trim())
            };

            const res = await authHttp.post(`${addFolderUrl}`, data);

            if (res.status.toString().startsWith("2")) {
                closeModal();
                afterAddingFolders();
            }
        } catch (error) {
            // Error creating folder
        }
    };

    return (
        <div className="w-full py-[30px] px-[5px]">
            <form onSubmit={handleSubmit}>
                <div className="py-[10px] px-[5px] w-full">
                    <div style={{ textAlign: "center" }} className="text-[#292D32] text-[14px] font-bold">
                        <span> Create Folder</span>
                    </div>
                    <div className='flex my-2 flex-col'>
                        <input
                            type="text"
                            className="w-full p-2 mb-2 border-2 border-solid border-[#ced2f2] rounded-sm"
                            name="name"
                            placeholder="Folder Name"
                            value={name}
                            onChange={(event) => setName(event.currentTarget.value)}
                        />
                        <textarea
                            ref={textAreaRef}
                            className="w-full p-2 mb-2 border-2 border-solid border-[#ced2f2] rounded-sm"
                            name="description"
                            placeholder="Description"
                            value={description}
                            style={{ height: "150px", fontSize: "16px" }}
                            onChange={(event) => setDescription(event.currentTarget.value)}
                        />
                        <input
                            type="text"
                            className="w-full p-2 mb-2 border-2 border-solid border-[#ced2f2] rounded-sm"
                            name="tags"
                            placeholder="Tags (comma separated)"
                            value={tags}
                            onChange={(event) => setTags(event.currentTarget.value)}
                        />
                        <div className="flex justify-center my-4">
                            <button
                                style={{ marginLeft: 10 }}
                                className={transparentButton()}
                            >
                                Create Folder
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}

export default AddFolder;
