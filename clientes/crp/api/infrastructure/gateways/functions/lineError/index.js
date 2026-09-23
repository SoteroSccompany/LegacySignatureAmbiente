
module.exports = () => {
    const stack = new Error().stack;
    const stackLines = stack.split('\n');
    const callerLine = stackLines[2]; // Linha 0 é o próprio Error, linha 1 é essa função, então linha 2 é o chamador

    // Extrai e formata o caminho do arquivo e número da linha
    const match = callerLine.match(/at (.+):(\d+):(\d+)/);
    if (match) {
        const [_, filePath, lineNumber, columnNumber] = match;
        const file = filePath.split('/');
        const fileName = file[file.length - 1];
        return `${fileName}: Linha: ${lineNumber} - Coluna: ${columnNumber}`;
    } else {
        return '0';
    }
}