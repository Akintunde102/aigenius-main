import { StructureFieldActionButton } from "./StructureFieldActionButton";
import { StructureFieldDisplay } from "./StructureFieldDisplay";
import { Structure } from "./types";

type StructureInputsProps = {
    scrollRef: any
    addField: () => void
    structureArr: Structure[]
    removeField: (id: string) => void
    onChangeFieldInStructure: (index: number, name: string, value: string | boolean) => void;
    highlightAddingField?: boolean
}

export const StructureInputs = ({
    scrollRef,
    addField,
    structureArr,
    removeField,
    onChangeFieldInStructure,
    highlightAddingField = false
}: StructureInputsProps) => {

    return (
        <div className="pb-2">
            <div className="text-[14px] pt-2">
                Structures:
            </div>
            <StructureFieldActionButton title="Add New Field +" onClickHandler={addField} highlight={highlightAddingField} />
            <div ref={scrollRef} className="flex flex-col my-2 max-h-[300px] overflow-y-auto">
                {
                    structureArr.map((structure, index) => {
                        return (
                            <StructureFieldDisplay
                                removeField={removeField}
                                structure={structure}
                                onChange={(name, value) => onChangeFieldInStructure(index, name, value)}
                                key={index}
                            />
                        )
                    })
                }
            </div>
        </div>
    )
}

