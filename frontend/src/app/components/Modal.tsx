import React, { useEffect, useRef } from "react";

export const Modal = (props: {
    buttonText: string;
    setIsOpen: any;
    title?: string;
    isOpen: any;
    children?: React.ReactNode;
    customWidth?: string;
    customClassName?: string;
    backgroundLayer?: React.ReactNode;
}) => {
    const { children, setIsOpen, isOpen, title, customWidth, customClassName, backgroundLayer } = props;

    const modalRef = useRef<HTMLDivElement | null>(null);

    const handleModalToggle = () => {
        setIsOpen(!isOpen);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                handleModalToggle()
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };

    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (event: any) => {
            if (event.keyCode === 27) {
                setIsOpen(false);
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };

    }, [setIsOpen]);


    if (isOpen) {
        return (
            <div className='modal-backdrop'>
                <div
                    className={`modal bg-gradient-to-br from-blue-50 to-white rounded-3xl shadow-xl border border-gray-200 ${customClassName || ''}`}
                    ref={modalRef}
                    style={{
                        maxWidth: '100vw',
                        // width: '95vw', // Default for mobile
                        boxSizing: 'border-box',
                        overflow: 'hidden',
                        ...(customWidth ? { width: customWidth } : {}),
                    }}
                >
                    {backgroundLayer}
                    <div className='modal-grid'>
                        {
                            title ? (
                                <div className="text-center my-2">
                                    <span className="text-[#24242E] text-[18px]">  {title}</span>
                                </div>
                            ) : <></>
                        }
                        <button className="close-button" onClick={handleModalToggle}>
                            <svg
                                width="12"
                                height="12"
                                viewBox="0 0 12 12"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M12 1.20857L10.7914 0L6 4.79143L1.20857 0L0 1.20857L4.79143 6L0 10.7914L1.20857 12L6 7.20857L10.7914 12L12 10.7914L7.20857 6L12 1.20857Z"
                                    fill="#4A4A6A"
                                />
                            </svg>
                        </button>

                        <div
                            className="modal-content"
                            {...(
                                customWidth ? { style: { width: customWidth } } : {}
                            )}
                        >
                            {children}
                        </div>
                    </div>
                </div>
                <style jsx>{`
          @media (max-width: 640px) {
            .modal {
              width: 95vw !important;
              min-width: 0 !important;
              max-width: 100vw !important;
              border-radius: 1.25rem !important;
            }
          }
        `}</style>
            </div>
        )
    }

    return <></>;
};
export default Modal;
