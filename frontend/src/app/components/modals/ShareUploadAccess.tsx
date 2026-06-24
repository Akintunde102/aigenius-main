import { button, transparentButton } from "@/lib/tailwind-classes";
import { isValidEmail } from "@/lib/gen";
import { serverCall } from "@/servercall/init";
import { serverCalls } from "@/servercall/store";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { getProjectUsers } from "@/lib/calls/get-project-users";

export const ShareUploadAccess = ({ message, title, onSubmit, onCancel, closeModal, warning }: {
    message: string
    title: string
    warning?: string
    onSubmit: () => void
    onCancel: () => void
    closeModal: () => void
}) => {

    const submitAndExit = () => {
        onSubmit();
        closeModal();
    }

    const [projectUsers, setProjectUsers] = useState<string[]>([]);
    const [email, setEmail] = useState<string>();
    const [emailIsValid, setEmailIsValid] = useState<boolean>(false);

    // useEffect(() => {
    //     getAndSetProjectUsers();
    // }, [])

    // const getAndSetProjectUsers = () => getProjectUsers({ projectId }).then((data: any) => {
    //     setProjectUsers(data.dataReturned);
    // })


    // const addProjectUser = async () => {
    //     try {
    //         const response = await serverCall({
    //             serverCallProps: {
    //                 call: serverCalls.postGatewayProjectsAddUser,
    //                 data: {
    //                     email,
    //                     projectId
    //                 }
    //             },
    //             authorized: true,
    //             onSuccess: () => {
    //                 getAndSetProjectUsers();
    //                 toast.success(`User: ${email} Added Successfully`);
    //             },
    //         });
    //         const { success, error } = response;

    //         if (!success) {
    //             const errorResponse = error.data.error.join(",");
    //             toast.error(errorResponse);
    //             return;
    //         }
    //     } catch (error: any) {
    //         if (typeof error === "string") {
    //             toast.error(error);
    //             return;
    //         }

    //         const errorResponse = error.response.data.error.join(",");
    //         if (errorResponse) {
    //             toast.error(errorResponse);
    //             return;
    //         }

    //         toast.error("Something Went Wrong");
    //     }

    // }


    // const removeProjectUser = async ({ emailToDelete }: any) => {
    //     const response = await serverCall({
    //         serverCallProps: {
    //             call: serverCalls.postGatewayProjectsRemoveUser,
    //             data: {
    //                 email: emailToDelete,
    //                 projectId
    //             }
    //         },
    //         authorized: true,
    //         onSuccess: () => {
    //             getAndSetProjectUsers();
    //             toast.success(`User: ${emailToDelete} Removed Successfully`);
    //         }
    //     });
    //     const { success, error, dataReturned } = response;

    //     if (!success) {
    //         const errorResponse = error.data.error.join(",");
    //         toast.success(errorResponse);
    //         return;
    //     }
    // }


    // const onEmailInputChange = (e: any) => {
    //     const value = e.target.value;

    //     if (value) {

    //         const emailIsValid = isValidEmail(value);

    //         if (!emailIsValid) {
    //             setEmailIsValid(false);
    //             return;
    //         }

    //         setEmailIsValid(true);
    //         setEmail(value)
    //     }
    // }

    return (
        <div className="py-[20px] px-[40px] max-w-[600px] w-full">
            <div style={{ textAlign: "center" }}>
                <h3> {title} </h3>
            </div>
            <div className='flex my-7 flex-col'>
                <span className="text-[16px] text-center">
                    {message}
                </span>

                <div className="flex justify-center my-4">
                    <button
                        onClick={submitAndExit}
                        style={{ marginLeft: 10 }}
                        className={transparentButton()}

                    >Yes
                    </button>

                    <button
                        onClick={onCancel}
                        style={{ marginLeft: 10 }}
                        className={button()}
                    >
                        No
                    </button>
                </div>
                <div className="text-red-500 text-[12px]">
                    {warning}
                </div>
            </div>
        </div>
    );
}
