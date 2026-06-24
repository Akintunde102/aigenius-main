'use client';
import { useFiles } from "./useFiles";
import { MMenu } from "../MMenu";
import { FileTemplate } from "./FileTemplate";
import { useRouter } from "next/navigation";
import { imageIsPresentInFiles, numberOfImagesPresentInFiles } from "@/lib/gen";
import { Modal } from "antd";
import { useState, useEffect } from "react";
import ShareAccess from "../modals/ShareAccess";
import { getUsersWithAccess } from "@/lib/calls/get-user-with-upload-access";
import { Folder, UserAccess } from "@/lib/types";
import { getFolders } from "@/lib/calls/get-folders";
import { CloudFile } from "./file.interface";

export default function FileUploaded({ folderId, folderDetails, dontShareAccess = false, files, userId }: {
    folderId?: string,
    folderDetails?: Folder,
    dontShareAccess?: boolean,
    files?: CloudFile[]
    userId?: string
}) {

    const { getFiles } = useFiles(folderId, userId);

    const uploadedFiles = files || getFiles();

    const router = useRouter();

    const [openModal, setOpenModal] = useState(false);

    const [usersWithAccess, setUsersWithAccess] = useState<UserAccess[]>([]);

    const [userBasedFolders, setUserBasedFolders] = useState<any[]>([]);

    const fetchUsersWithAccess = async () => {
        try {
            const response = await getUsersWithAccess(folderId);
            setUsersWithAccess(response.data);
        } catch (error) {
            // Failed to fetch users with access
        }
    };

    const fetchUserBasedFolders = async () => {
        try {
            const response = await getFolders("all-files");
            setUserBasedFolders(response);
        } catch (error) {
            // Failed to fetch users with access
        }
    }

    useEffect(() => {
        if (!dontShareAccess) {
            fetchUsersWithAccess()
        }

        fetchUserBasedFolders()
    }, [dontShareAccess, folderId]);


    const getImageGalleryLink = () => {
        if (folderId) {
            return `/upload/folders/${folderId}/images`;
        }

        if (userId) {
            return `/upload/users/${userId}/images`;

        }
        return `/upload/images`;
    }

    return (
        <section
            className='mt-10 w-[1300px]'
            style={{ maxWidth: "100%", marginInline: "auto" }}
        >
            {

                <>
                    <div className="mb-8">
                        {
                            imageIsPresentInFiles(uploadedFiles) ? (
                                <MMenu label={`View Image Gallery (${numberOfImagesPresentInFiles(uploadedFiles)})`} handleClick={() => {
                                    const link = getImageGalleryLink();
                                    router.push(link)
                                }} />)
                                : <> </>
                        }
                        <MMenu label="Folders" handleClick={() => {
                            router.push('/upload/folders')
                        }} />

                        {
                            !dontShareAccess &&
                            <MMenu label={`Share Access (${usersWithAccess.length})`} handleClick={() => {
                                setOpenModal(true)
                            }} />
                        }

                        {
                            userBasedFolders.map((folder) => {
                                const folderName = `${folder.giverDetails.firstName} ${folder.giverDetails.lastName}'s Files`;
                                return (
                                    <MMenu key={folder.id} label={folderName} handleClick={() => {
                                        router.push(`/upload/users/${folder.giverDetails.id}`)
                                    }} />
                                )
                            })
                        }
                    </div>
                </>
            }

            <FileTemplate uploadedFiles={uploadedFiles} />

            <Modal
                title="Share Access"
                open={openModal}
                onOk={() => {

                }}
                onCancel={() => setOpenModal(false)}
            >
                <ShareAccess
                    closeModal={() => setOpenModal(false)}
                    afterSharingAccess={() => setOpenModal(false)}
                    folderId={folderId}
                    fetchUsersWithAccess={fetchUsersWithAccess}
                    usersWithAccess={usersWithAccess}
                    folderDetails={folderDetails}
                />
            </Modal>
        </section>
    )
}
