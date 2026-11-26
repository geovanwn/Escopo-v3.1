export const getStorage = () => ({});
export const ref = () => ({});
export const uploadBytes = async () => ({});
export const getDownloadURL = async () => "";
export const deleteObject = async () => {};
export const uploadBytesResumable = () => {
    return {
        on: (event: string, progress: any, error: any, complete: any) => {
            if (complete) complete();
        }
    };
};
