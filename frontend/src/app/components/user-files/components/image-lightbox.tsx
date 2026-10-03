import type { CloudFile } from "@/app/components/file/file.interface";
import { ImagePreviewLightbox } from "@/app/components/model-interface/features/message-types/components/ImagePreviewLightbox";
import { buildCloudFileDisplayName } from "../user-files.utils";


export function ImageLightbox({
  file,
  onClose,
  onSavedToUploads,
}: {
  file: CloudFile;
  onClose: () => void;
  onSavedToUploads?: (file: CloudFile) => void;
}) {
  return (
    <ImagePreviewLightbox
      imageUrl={{
        fileUrl: file.s3Link,
        fileName: buildCloudFileDisplayName(file),
        kind: "image",
      }}
      onClose={onClose}
      onSavedToUploads={onSavedToUploads}
    />
  );
}