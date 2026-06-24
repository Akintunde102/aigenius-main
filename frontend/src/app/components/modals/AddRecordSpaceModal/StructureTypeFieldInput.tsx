import { CompatibleStructureFieldType } from "@/lib/types";

type StructureTypeFieldInputProps = {
    name: string;
    value: string | boolean;
    setValue: (value: any) => void;
}

export const StructureTypeFieldInput = ({ name, value, setValue }: StructureTypeFieldInputProps) => {
    const StructureFieldTypes = Object.values(CompatibleStructureFieldType);

    return (
        <>
            {
                StructureFieldTypes.map((fieldType: CompatibleStructureFieldType, i: number) => {
                    return (
                        <button
                            style={{
                                padding: "4px 2px",
                                margin: "0 2px",
                                width: "100%",
                                fontSize: "12px",
                                textAlign: "center"
                            }}
                            className={`rounded text-[12px] border-2 border-blue ${value === fieldType ? "bg-blue-500 text-white" : "bg-white text-blue-700"}`}
                            onClick={() => {
                                setValue(fieldType)
                            }}
                            key={i}
                        >
                            {fieldType}
                        </button>
                    )
                })
            }
        </ >
    )
}