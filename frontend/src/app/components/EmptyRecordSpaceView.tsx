import Link from "next/link";

export const EmptyRecordSpaceView = ({ sharedProjectData, setOpenModal, openModal, projectId }: {
    sharedProjectData: any;
    setOpenModal: any;
    openModal: any;
    projectId: string;
}) => {
    return (
        <div>
            <div className="flex items-center justify-center" style={{ height: "80vh" }}>
                <div className="bg-[#ffffff] p-16 rounded-md shadow-md">
                    <div className="text-center mx-10">
                        <p className="my-2">You have No RecordSpaces at the moment</p>
                        <Link
                            href="https://docs.nobox.cloud/integrate-nobox"
                            target="_blank"
                            className="my-2 n_link"
                        >
                            Integrate Your App/Website to Add recordSpaces
                        </Link>
                    </div>

                    <div className="mt-[30px]">
                        {!sharedProjectData && (
                            <div className="py-[12px] text-center">
                                <button
                                    className="bg-blue-500 hover:bg-blue-700 text-white font-medium text-xs py-2 px-4 rounded"
                                    onClick={() => {
                                        setOpenModal(true);
                                    }}
                                >
                                    Add User To Project
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}