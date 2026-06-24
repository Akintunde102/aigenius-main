'use client'

import Image from "next/image"
import { Upload } from "antd"
import { useFiles } from "./useFiles";

const FileUploader = ({ folderId }: {
    folderId?: string
}) => {

    const { upload } = useFiles(folderId);

    return (
        <section
            className='mt-10 w-[900px]'
            style={{ maxWidth: "100%", marginInline: "auto" }}
        >
            <Upload
                customRequest={upload}
                listType="picture"
                defaultFileList={[]}
                multiple={true}
            >
                <div
                    className="relative border-2 w-full border-gray-300 border-dashed rounded-lg p-6"
                >
                    <div className="text-center">
                        <Image
                            className="mx-auto h-12 w-12"
                            src="https://www.svgrepo.com/show/357902/image-upload.svg"
                            alt="Upload File"
                            width={100}
                            height={100}
                        />

                        <h3 className="mt-2 text-sm font-medium text-gray-900">
                            <label
                                htmlFor="file-upload"
                                className="relative cursor-pointer"
                            >
                                <span>Drag and drop</span>
                                <span className="text-indigo-600"> or browse &nbsp;</span>
                                <span>to upload</span>
                            </label>
                        </h3>
                        <p className="mt-1 text-xs text-gray-500">
                            Upload Any kind of file
                        </p>
                    </div>

                </div>

            </Upload>
        </section>
    )
}

export default FileUploader;
