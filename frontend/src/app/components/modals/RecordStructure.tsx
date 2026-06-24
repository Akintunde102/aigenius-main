import { capitalizeFirstLetter, convertTypeToTypeName } from "@/lib/gen";
export type RecordStructure = {
    space: string,
    description: string;
    structure: Record<string, {
        required: boolean;
        unique: false;
        description: string;
        comment: string;
        hashed: boolean;
        name: string;
        type: string;
    }>
}

export const FieldDisplay = (props: {
    name: string;
    value: string;
}) => {

    const { name, value } = props;

    return (
        <div className="flex my-2 border-r-4 py-1">
            <span className="text-[12px] mx-2">
                {capitalizeFirstLetter(name)}:
            </span>
            {
                value ? <span className="text-[12px]">
                    {String(value)}
                </span> : <span className="text-[12px] text-[#9b4f4f] italic">empty</span>
            }

        </div>
    )
}

export const RecordStructure = ({ recordStructure, closeModal }: {
    recordStructure: RecordStructure
    closeModal: () => void
}) => {
    const structureArr = Object.entries(recordStructure.structure);

    return (
        <div className="py-[4px] px-[10px] max-h-[500px] w-full overflow-y-auto">
            <div className='flex my-2 flex-col'>
                <div>
                    <FieldDisplay name="space" value={recordStructure.space} />
                    <FieldDisplay name="description" value={recordStructure.description} />
                    <div className="pb-1">
                        <div className="text-[12px] mx-2 pt-2">Structures:</div>
                        <div className="flex flex-col mx-8 my-2 max-h-[300px] overflow-y-auto">
                            {
                                structureArr.map(([key, value], i) => {
                                    const valueEntries = Object.entries(value);
                                    return (
                                        <div className="border border-solid border-[#E6E8F9] my-1 px-3" key={i}>
                                            <div className="text-[14px] text-[#24242E] my-2 " >
                                                <span className="font-bold ">{capitalizeFirstLetter(key)}</span> : {convertTypeToTypeName(recordStructure.structure[key].type)}
                                            </div>
                                            <div className="my-2">
                                                {
                                                    valueEntries.filter(([k, v]) => k !== "name" && k !== "type" && Boolean(v)).map((valueEntry: [string, any], i) => {
                                                        let [k, v] = valueEntry;
                                                        if (k === "type") {
                                                            v = convertTypeToTypeName(v)
                                                        }
                                                        return (
                                                            <div className="leading-tight" key={i}>
                                                                <span className="text-[12px]">
                                                                    {capitalizeFirstLetter(k)}: &nbsp;
                                                                </span>
                                                                <span className="text-[12px]">
                                                                    {String(v)}
                                                                </span>
                                                            </div>
                                                        )
                                                    })
                                                }
                                            </div>
                                        </div>
                                    )
                                })
                            }
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
