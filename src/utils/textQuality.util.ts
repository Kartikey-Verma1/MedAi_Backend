const textQuality = (text: string) : boolean => {

    const trimedText = text.trim();

    if(!trimedText || trimedText.length < 30) return false;

    for(let i = 0; i < trimedText.length; i++){
        const charCode = trimedText.charCodeAt(i);
        if((charCode >= 0xE000 && charCode <= 0xF8FF) || (charCode >= 0xF0000 && charCode <= 0xFFFFD) || (charCode >= 0x100000 && charCode <= 0x10FFFD)){
            return false;
        }
    }
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(trimedText)) {
        return false;
    }
    return true;
}

export default textQuality;