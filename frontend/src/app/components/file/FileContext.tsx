'use client';
import { CloudFile } from './file.interface';
import copy from 'copy-to-clipboard';
import { useContext, createContext, FC, PropsWithChildren, useState } from 'react';
import { toast } from 'react-hot-toast';

interface FileContextType {
    uploaded: CloudFile[],
    setUploaded: (args: any) => void,
    removeFile: (name?: string) => void
    // upload: (options: any) => Promise<void>
    copyLink: (link: string, name: string) => void,
    toast: typeof toast
}

const FileContext = createContext<FileContextType | undefined>(undefined);

const useFileContext = () => {
    const context = useContext(FileContext);

    if (context === undefined) {
        throw new Error('useFileContext must be used within FileContextProvider');
    }

    return context;
}

export default useFileContext;


export const FileContextProvider: FC<PropsWithChildren> = ({ children }) => {


    const [uploaded, setUploaded] = useState<CloudFile[]>([]);

    const removeFile = (name?: string) => {
        // TODO: Implement delete files logic
    }

    const copyLink = (link: string, name: string) => {
        copy(link);
        toast.success(`Copied ${name} link to clipboard`);
    }



    const contextValue = {
        uploaded,
        setUploaded,
        removeFile,
        copyLink,
        toast
    }


    return (
        <FileContext.Provider value={contextValue}>
            {children}
        </FileContext.Provider>
    )
}
