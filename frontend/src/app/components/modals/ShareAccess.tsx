import { useState } from "react";
import { authHttp } from "@/lib/api/auth-client";
import dynamic from 'next/dynamic';
import { getUserDetails, shareUploadAccessUrl } from "../file/constants";
import { storage } from "@/lib/utils/store";
import { storageConstants } from "@/lib/constants";
import toast from "react-hot-toast";
import { Folder, UserAccess, UserDetailsInLocalStorage } from "@/lib/types";

// Code split Antd components to reduce bundle size
const Avatar = dynamic(() => import("antd").then(mod => ({ default: mod.Avatar })), {
    ssr: false,
    loading: () => <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
});

const Button = dynamic(() => import("antd").then(mod => ({ default: mod.Button })), {
    ssr: false,
    loading: () => <div className="px-4 py-2 bg-gray-200 rounded animate-pulse"></div>
});

const loggedUser = storage(storageConstants.LOGGED_USER_DETAILS).getObject() as any;

const accessUserIsLoggedIn = (userWithAccess: UserAccess) => {
    return loggedUser.email === userWithAccess.takerDetails.email;
};

const ShareAccessSearchBar = ({ onUserSelected }: { onUserSelected: (user: any) => void; }) => {
    const [email, setEmail] = useState<string>("");
    const loggedUserDetails = storage(storageConstants.LOGGED_USER_DETAILS).getObject() as UserDetailsInLocalStorage;

    const getUserDetailsByEmail = async (email: string) => {
        try {
            const res = await authHttp.get(`${getUserDetails(email)}`);

            if (res.status.toString().startsWith("2")) {
                const userData = res.data;
                return userData;
            } else {
                toast.error("User not found");
                setEmail("");
            }
        } catch (error) {
            toast.error("User not found");
            setEmail("");
        }
    };

    const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter" && email) {
            if (email === loggedUserDetails.email) {
                toast.error("You can't add yourself");
                setEmail("");
                return;
            }
            getUserDetailsByEmail(email);
        }
    };

    const handleButtonClick = async () => {
        if (email && email !== loggedUserDetails.email) {
            const user = await getUserDetailsByEmail(email);
            if (user) {
                onUserSelected(user);
            }
        } else {
            toast.error("Invalid email or you can't add yourself");
            setEmail("");
        }
    };

    return (
        <div className="py-[10px] px-[5px] w-full">
            <div className="flex my-2 flex-col">
                <input
                    type="email"
                    className="w-full p-2 mb-2 border-2 border-solid border-[#ced2f2] rounded-sm"
                    name="email"
                    placeholder="User Email"
                    value={email}
                    onChange={(event) => setEmail(event.currentTarget.value)}
                    onKeyPress={handleKeyPress}
                />
                <Button type="default" onClick={handleButtonClick}>
                    Add User
                </Button>
            </div>
        </div>
    );
};

const ShareAccessUsersList = ({ usersWithAccess, onRemoveUserClick }: {
    usersWithAccess: UserAccess[],
    onRemoveUserClick: (userId: string) => void;
}) => {

    return (
        <div className="py-[10px] px-[5px] w-full">
            <div style={{ textAlign: "center" }} className="text-[#292D32] text-[14px] font-bold">
                <span> Users with Access</span>
            </div>
            <div className="flex flex-col gap-2">
                {usersWithAccess.map((user) => (
                    <div key={user.takerDetails.id} className="flex items-center justify-between p-2">
                        <Avatar className="mr-2" src={user.takerDetails.profileImage} />
                        <span className="text-[#292D32] text-[14px] font-bold">{user.takerDetails.firstName}</span>
                        <span className="text-[#292D32] text-[14px] font-bold">{user.takerDetails.email}</span>
                        <span className="text-[#292D32] text-[12px]">{user.dateAdded}</span>
                        {
                            !accessUserIsLoggedIn(user) ?
                                <></> :
                                (

                                    <Button
                                        type="primary"
                                        danger
                                        onClick={() => onRemoveUserClick(user.takerDetails.id)}
                                    >
                                        Remove
                                    </Button>
                                )
                        }
                    </div>
                ))}
            </div>
        </div>
    );
};


const ShareAccess = ({ closeModal, afterSharingAccess, folderId, fetchUsersWithAccess, usersWithAccess, folderDetails }: {
    closeModal: () => void;
    afterSharingAccess: () => void;
    folderId?: string;
    fetchUsersWithAccess: () => void;
    folderDetails?: Folder;
    usersWithAccess: UserAccess[]
}) => {

    const folderIsOwnedByLoggedUser = () => {
        const loggedUserDetails = storage(storageConstants.LOGGED_USER_DETAILS).getObject() as UserDetailsInLocalStorage;
        return loggedUserDetails.email === folderDetails?.creatorDetails.email;
    }

    const loggedUserIsAllowedToAddAccess = folderId ? folderIsOwnedByLoggedUser() : true;

    const handleUserSelected = async (user: any) => {
        try {
            const data = {
                takerId: user.id,
            };
            const res = await authHttp.post(`${shareUploadAccessUrl(folderId)}`, data);

            if (res.status.toString().startsWith("2")) {
                fetchUsersWithAccess();
            }
        } catch (error: any) {
            toast.error(error.response.data.message);
        }
    };

    const handleRemoveUserClick = async (userId: string) => {
        try {
            const res = await authHttp.delete(`${shareUploadAccessUrl(folderId, userId)}`);

            if (res.status.toString().startsWith("2")) {
                fetchUsersWithAccess();
            }
        } catch (error) {
            toast.error("Failed to remove user access");
        }
    };

    return (
        <div className="w-full py-[30px] px-[5px]">
            {
                loggedUserIsAllowedToAddAccess ? (
                    <ShareAccessSearchBar onUserSelected={handleUserSelected} />
                ) : (
                    <></>
                )
            }

            {usersWithAccess.length > 0 ? (
                <ShareAccessUsersList usersWithAccess={usersWithAccess} onRemoveUserClick={handleRemoveUserClick} />
            ) : (
                <div className="text-center text-[#292D32] text-[14px] font-bold py-4">
                    No users have been added to this folder yet.
                </div>
            )}
        </div>
    );
};

export default ShareAccess;
