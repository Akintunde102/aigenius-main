import { StructureFieldInput } from "./StructureFieldInput";
import { StructureFieldButtonInput } from "./StructureFieldButtons";
import { StructureFieldActionButton } from "./StructureFieldActionButton";
import { Structure } from "./types";
import { useState } from "react";

type StructureFieldDisplayProps = {
    removeField: (id: string) => void
    structure: Structure;
    onChange: (
        name: string, value: string | boolean
    ) => void
}

export const StructureFieldDisplay = ({
    removeField,
    structure,
    onChange
}: StructureFieldDisplayProps) => {
    const { id, ...fields } = structure;
    const fieldEntries = Object.entries(fields);
    const inputFieldEntries = fieldEntries.filter(([key]) => ["name", "description", "type", "comment"].includes(key));
    const buttonFieldEntries = fieldEntries.filter(([key]) => ["required", "unique", "hashed"].includes(key));

    const [showOptionalFields, setShowOptionalFields] = useState(false);

    return (
        <div className="border border-solid border-[#ced2f2] my-1 px-3">
            <StructureFieldActionButton title={`Remove  ${structure.name || id}`} onClickHandler={() => removeField(id)} />
            <div className="text-right m-0 p-0">
                <span className="text-[8px] text-[#1C1B1B] underline cursor-pointer" onClick={() => setShowOptionalFields(!showOptionalFields)}>{`${showOptionalFields ? "Hide" : "Show"} other Fields`}</span>
            </div>
            <div className="my-2 space-y-2">
                {inputFieldEntries.map(([key, value], i) => (
                    <StructureFieldInput
                        key={i}
                        name={key}
                        value={value}
                        onChange={(name, value) => onChange(name, value)}
                        showOptionalInputFields={showOptionalFields}
                    />
                ))}
                <div className="flex space-x-2">
                    {buttonFieldEntries.map(([key, value], i) => (
                        <StructureFieldButtonInput
                            key={i}
                            name={key}
                            value={value}
                            onChange={(name, value) => onChange(name, value)}
                        />
                    ))}
                </div>
            </div>
        </div >
    )
}

