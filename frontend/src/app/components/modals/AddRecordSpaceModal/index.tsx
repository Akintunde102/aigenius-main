import { useEffect, useRef, useState } from "react";
import { FieldInput } from "./FieldInput";
import { CompatibleStructureFieldType } from "@/lib/types";
import { StructureInputs } from "./StructureInputs";
import { SubmitButton } from "./SubmitButton";
import { Structure } from "./types";
import { serverCall } from "@/servercall/init";
import { serverCalls } from "@/servercall/store";
import toast from "react-hot-toast";
import createUIIndication from "@/lib/createUIIndication";
import { findProject } from "@/lib/gen";

type AddRecordSpaceModalProps = {
    projectId: string;
    closeModal: () => void;
    refreshData: () => Promise<void>;
}

export const AddRecordSpaceModal = ({
    projectId,
    closeModal,
    refreshData
}: AddRecordSpaceModalProps) => {
    const defaultStructure = (id: string) => ({
        id,
        name: "",
        type: CompatibleStructureFieldType.text,
        description: "",
        comment: "",
        hashed: false,
        unique: false,
        required: false,
    });

    const defaultSpace = "";
    const defaultDescription = "";

    const [structureArr, setStructureArr] = useState<Structure[]>([]);
    const [space, setSpace] = useState(defaultSpace);
    const [description, setDescription] = useState(defaultDescription);
    const [highlightAddingStructureField, setHighlightAddingStructureField] = useState(false);

    const hightlightIndicator = createUIIndication(setHighlightAddingStructureField);

    const scrollRef = useRef<any>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, []);

    const onChangeSpace = (value: string) => {
        setSpace(value.replace(/\s/g, ''));
    }

    const onChangeDescription = (value: string) => {
        setDescription(value);
    }

    const addField = () => {
        setStructureArr([...structureArr, defaultStructure(structureArr.length.toString())]);

        setTimeout(() => {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;

            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight + 200,
                behavior: "smooth",
                duration: 300,
            });
        }, 300);
    }

    const removeField = (id: string) => {
        setStructureArr(structureArr.filter((value: Structure) => value.id !== id));
    }

    const onChangeFieldInStructure = (structureId: number, name: string, value: string | boolean) => {
        const tmp = [...structureArr];
        (tmp[structureId] as any)[name] = value;
        setStructureArr(tmp);
    }

    const assertAddRecordSpace = () => {

        if (space === "") {
            toast.error("Please Enter Record Space Name");
            return false;
        }


        if (structureArr.length === 0) {
            hightlightIndicator.startEnd({
                delay: 500,
                startValue: true,
                endValue: false
            })
            toast.error("fields cannot be empty, Please add a New Field");
            return false;
        }

        return true

    }

    const addRecordSpace = async () => {
        try {

            const valid = assertAddRecordSpace();

            if (!valid) {
                return;
            }

            if (structureArr.length === 0) {
                hightlightIndicator.startEnd({
                    delay: 5000,
                    startValue: true,
                    endValue: false
                })
                toast.error("fields cannot be empty, Please add a New Field");
                return;
            }

            const res = await serverCall({
                serverCallProps: {
                    call: serverCalls.postGatewayRecordSpace,
                    data: {
                        name: space,
                        description: "",
                        projectSlug: findProject({ projectId }).slug,
                        slug: space.toLowerCase(),
                        recordFieldStructures: structureArr
                    },
                },
                pathArgs: { projectId },
                authorized: true,
                onSuccess: (res) => {
                    // Record space added successfully
                },
            });

            const { success } = res;

            if (success) {
                await refreshData();
                toast.success(`Record Space: ${space} Added Successfully`);
                closeModal();
            }

        } catch (error: any) {
            const extractedErrorMessage = error.response.data.error || "Please Try Again";
            toast.error(extractedErrorMessage === "Bad Request" ? "Please fill in all fields" : extractedErrorMessage);
        }
    }
    return (
        <div className="py-[4px] px-[5px] w-full mx-2">
            <div className='max-h-[500px] overflow-y-auto flex flex-col my-2 '>
                <FieldInput name="Name" value={space} setValue={onChangeSpace} placeholder="name of record space" />
                <FieldInput name="Description" value={description} setValue={onChangeDescription} placeholder="description of record space" />
                <StructureInputs
                    scrollRef={scrollRef}
                    addField={addField}
                    structureArr={structureArr}
                    removeField={removeField}
                    onChangeFieldInStructure={onChangeFieldInStructure}
                    highlightAddingField={highlightAddingStructureField}
                />
                <SubmitButton onClickHandler={() => {
                    addRecordSpace();
                }} title="Submit" />
            </div>
        </div>
    );
}
