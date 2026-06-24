import { copyToClipboard } from "@/lib/copyToClipboard";
import { capitalizeFirstLetter } from "@/lib/gen";
import { serverCall } from "@/servercall/init";
import { serverCalls } from "@/servercall/store";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

export const FieldDisplay = (props: {
    name: string;
    value: string;
    handleChange: (e: any) => void;
    required?: boolean
}) => {

    const { name, value, handleChange, required } = props;

    return (

        <div>
            <div className="text-[14px]">
                {capitalizeFirstLetter(name)}
                {required && <span className="text-red-500"> * </span>}
                {/* <span className="text-[12px] italic">e.g. User&apos;s list</span> */}
            </div>
            <input
                className="w-full border border-blue-900 px-3 py-2 my-2 focus:outline-none focus:ring-2 focus:ring-blue-900 focus:ring-offset-2 focus:ring-offset-white"
                placeholder=""
                value={value}
                name={name}
                onChange={handleChange}
            />
        </div>
    )
}

type GooglAuthProps = {
    projectSlug: string;
    projectId: string;
};

export const GoogleAuth = ({ projectSlug, projectId }: GooglAuthProps) => {

    const [googleAuth, setGoogleAuth] = useState({
        clientId: "",
        clientSecret: "",
        clientAuthPath: "",
        clientAuthJWTVerificationToken: ""
    })

    const handleChange = (e: any) => {
        setGoogleAuth({
            ...googleAuth,
            [e.target.name]: e.target.value
        });
    }

    const handleSubmit = async (e: any) => {
        e.preventDefault();


        const { clientId, clientSecret, clientAuthPath, clientAuthJWTVerificationToken } = googleAuth;

        if (!clientId || !clientSecret || !clientAuthPath || !clientAuthJWTVerificationToken) {
            toast.error("Please Fill in All Fields");
            return;
        }

        try {
            const res = await serverCall({
                serverCallProps: {
                    call: serverCalls.postGatewayGoogleAuth,
                    data: {
                        projectId,
                        conf: googleAuth
                    }
                },
                pathArgs: { projectSlug },
                authorized: true,
                onSuccess: (res) => {
                    toast.success("Google Auth Details Updated");
                },
            });

        } catch (error: any) {
            toast.error(error);
        }


    }

    const getGoogleAuthDetails = async () => {
        const res = await serverCall({
            serverCallProps: {
                call: serverCalls.getGatewayGoogleAuth,
                params: {
                    projectId
                },
            },
            pathArgs: { projectSlug },
            authorized: true,
            onSuccess: (res) => {
                const { googleAuth: { clientId, clientSecret, clientAuthPath, clientAuthJWTVerificationToken } } = res;
                setGoogleAuth({
                    clientId, clientSecret, clientAuthPath, clientAuthJWTVerificationToken
                });
            },
        });

    }


    useEffect(() => {
        getGoogleAuthDetails()
    }, [getGoogleAuthDetails]);

    const handleCopyGoogleLink = () => {
        copyToClipboard(`${process.env.NEXT_PUBLIC_NOBOX_API_ROOT_URL}/${projectId}/auth/google`, "Google Link Copied");
    };

    const handleCopyGoogleCallback = () => {
        copyToClipboard(`${process.env.NEXT_PUBLIC_NOBOX_API_ROOT_URL}/${projectId}/auth/google/callback`, "Callback Url Copied");
    };


    return (
        <div className="py-[4px] px-[10px] max-h-[500px] w-full overflow-y-auto">
            <div className='flex my-2 flex-col'>
                <div>
                    <div>

                        <div
                            onClick={handleCopyGoogleLink}
                            className=" cursor-pointer text-[14px] text-center bg-black px-3 py-2 my-2 text-white"
                        >
                            Copy Google Auth Link
                        </div>


                        <div
                            onClick={handleCopyGoogleCallback}
                            className=" cursor-pointer text-[14px] text-center bg-black px-3 py-2 my-2 text-white"
                        >
                            Copy Google CallBack
                        </div>
                    </div>
                    <FieldDisplay name="clientId" handleChange={handleChange} value={googleAuth.clientId} required />
                    <FieldDisplay name="clientSecret" handleChange={handleChange} value={googleAuth.clientSecret} required />
                    <FieldDisplay name="clientAuthPath" handleChange={handleChange} value={googleAuth.clientAuthPath} required />
                    <FieldDisplay name="clientAuthJWTVerificationToken" handleChange={handleChange} value={googleAuth.clientAuthJWTVerificationToken} required />
                    <button
                        className="w-full border text-white px-3 bg-blue-700 py-2 my-2 focus:outline-none focus:ring-2"
                        onClick={handleSubmit}
                    >
                        Submit
                    </button>
                </div>
            </div>
        </div>
    );
}
