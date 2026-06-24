'use client'
import { Avatar, Button, message } from 'antd';
import React, { useState } from 'react';
import { Copy, Trash } from 'lucide-react';
import { CloudFile } from './file/file.interface';
import { copyToClipboard } from '@/lib/copyToClipboard';
import AddFileDescription from './modals/AddFileDescription';
import Modal from './Modal';
import { storageConstants } from '@/lib/constants';
import { storage } from '@/lib/utils/store';
import { getFileType, getVideoMimeType } from '../lib/utils/get_file_type';
import { authHttp } from '@/lib/api/auth-client';
import { deleteFileUrl } from './file/constants';
import Image from 'next/image';

const FileDetails = ({ file: _file }: { file: CloudFile; }) => {
    const [file, setFile] = useState<CloudFile>(_file);

    const [openModal, setOpenModal] = useState(false);

    const [deleteButtonClicked, setDeleteButtonClicked] = useState(false);

    const loggedUserDetails = storage(storageConstants.LOGGED_USER_DETAILS).getObject() as any;

    const { type: fileType, extension: fileExtension } = getFileType(file);

    const cantAddDescription = loggedUserDetails.id !== file.ownedBy;

    const deleteFile = async (fileId: string) => {
        if (!deleteButtonClicked) {
            setDeleteButtonClicked(true);
            return;
        }

        try {
            await authHttp.delete(deleteFileUrl(fileId));
            message.success('File deleted successfully');
        } catch (error: any) {
            message.error(error.response.data.message);
        } finally {
            setDeleteButtonClicked(false);
            if (typeof window !== 'undefined') {
                window.history.back();
            }
        }
    }

    const getFilePreview = () => {
        if (fileType === 'image') {
            return <Image src={file.s3Link} alt={file.name} width={600} height={400} className="w-full h-auto object-cover" />;
        }

        if (fileType === 'video') {
            return <video controls className="w-full h-auto">
                <source src={file.s3Link} type={getVideoMimeType(fileExtension)} />
                Your browser does not support the video tag.
            </video>;
        }

        return (
            <div className="flex items-center justify-center w-48 h-48 bg-gray-200 text-gray-700 text-4xl font-bold rounded-2xl">
                {fileExtension.toUpperCase()}
            </div>
        );
    };


    const handleDownload = async (url: string) => {
        const a = document.createElement('a');
        a.href = url;
        a.download = 'downloaded-file.pdf'; // Customize filename
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    };

    const handleCopyLink = () => {
        if (typeof window !== 'undefined') {
            copyToClipboard(`${window.location.origin}/upload/${file.id}`, "File Link Copied");
        }
    };


    return (
        <div className="w-full">
            <div className="flex items-center space-x-2">
                <Avatar src={file.ownerDetails?.profileImage} alt="User Avatar" />
                <span className="text-sm">
                    <span className="font-semibold">{file.ownerDetails?.firstName} {file.ownerDetails?.lastName}</span>
                </span>
            </div>
            <div className="flex  flex-col md:flex-row items-center md:justify-between  justify-center p-4 bg-gray-50">
                <Button
                    style={{ width: 200 }}
                    onClick={() => handleDownload(file.s3Link)}
                    className="flex justify-center items-center my-2 space-x-2 bg-white border border-gray-300">
                    <Copy size={16} />
                    <span>Download</span>
                </Button>


                <Button
                    style={{ width: 200 }}
                    onClick={handleCopyLink} className="flex justify-center items-center space-x-2 bg-white border border-gray-300">
                    <Copy size={16} />
                    <span>Copy Page Link</span>
                </Button>


                <Button
                    style={{ width: 200 }}
                    onClick={() => {
                        copyToClipboard(file.s3Link, "Download Link Copied");
                    }} className="flex justify-center items-center space-x-2 bg-white border border-gray-300">
                    <Copy size={16} />
                    <span>Copy Download Link</span>
                </Button>


            </div>
            <div className="flex flex-col md:flex-row items-start p-4 bg-gray-50">
                <div className="w-full md:w-2/3">
                    {getFilePreview()}
                </div>
                <div className="flex flex-col items-start space-y-4 md:mx-4 w-full md:w-1/3">
                    {
                        file.description ? (
                            <div className="flex flex-col items-start w-full space-y-2">
                                <p className="text-lg py-12 text-gray-500">{file.description}</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-start w-full my-4">
                                {
                                    cantAddDescription ? (
                                        <span className="text-sm text-gray-500">...</span>
                                    ) : (
                                        <Button
                                            style={{ width: 200 }}
                                            className='w-full bg-black text-white'
                                            onClick={() => setOpenModal(true)} type="primary">
                                            Add Description
                                        </Button>
                                    )
                                }
                            </div>
                        )
                    }
                    <div className="flex flex-col items-start w-full space-y-2">
                        <span className="text-sm">File Name:</span>
                        <span className="text-sm">{file.name}</span>
                    </div>
                    {
                        file?.fileSizeInBytes && (
                            <div className="flex flex-col items-start w-full space-y-2">
                                <span className="text-sm">File Size:</span>
                                <span className="text-sm">{(file?.fileSizeInBytes / 1024).toFixed(2)} KB</span>
                            </div>
                        )
                    }
                    <div className="flex flex-col items-start w-full space-y-2">
                        <span className="text-sm">File Type:</span>
                        <span className="text-sm">{fileExtension.toUpperCase()}</span>
                    </div>
                    <div className="flex flex-col items-start w-full space-y-2">
                        <span className="text-sm">Uploaded At:</span>
                        <span className="text-sm">{new Date(file.createdAt).toDateString()}</span>
                    </div>
                </div>
            </div>

            <Button
                style={{ width: 200 }}
                onClick={() => deleteFile(file.id)}
                className={`
                ${deleteButtonClicked ? 'bg-red-500' : 'bg-white'}
                flex justify-center items-center space-x-2 border border-gray-300
                `}
            >
                <Trash size={16} />
                <span>
                    {deleteButtonClicked ? 'Are You Sure?' : 'Delete'}
                </span>
            </Button>

            <Modal
                isOpen={openModal}
                setIsOpen={setOpenModal}
                buttonText={"Copy Text"}
            >
                <AddFileDescription
                    fileId={file.id}
                    closeModal={() => setOpenModal(false)}
                    onSuccessfulUpload={(file) => {
                        setFile(file);
                    }}
                />
            </Modal>
        </div>
    );
};

export default FileDetails;
