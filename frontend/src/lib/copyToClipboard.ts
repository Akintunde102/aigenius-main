import toast from 'react-hot-toast';

export const copyToClipboard = (text: string, successMessage = "Text Copied 😇") => {
  navigator.clipboard
    .writeText(text)
    .then(() => {
      toast.success(successMessage);
    })
    .catch((err) => {
      toast.error(`Could not copy text: ${err}`);
    });
};
