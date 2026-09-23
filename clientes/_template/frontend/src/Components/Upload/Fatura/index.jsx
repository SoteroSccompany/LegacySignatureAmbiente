import React, { useState, useRef } from 'react';

const DragAndDropComponent = ({ setError, setErrorFileMessage, file, setFile }) => {
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef(null);

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
            if (files[0].type !== 'application/pdf' && files[0].type !== 'image/png' && files[0].type !== 'image/jpeg' && files[0].type !== 'image/jpg') {
                setError(true);
                setErrorFileMessage('Arquivo inválido. Por favor, selecione um arquivo PDF, PNG, JPEG ou JPG.');
                return;
            } else {
                setError(false);
                setErrorFileMessage('Campo obrigatório.');
            }
            const file = files[0];
            setFile(file);
        }
    };

    const handleFileSelect = (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            if (files[0].type !== 'application/pdf' && files[0].type !== 'image/png' && files[0].type !== 'image/jpeg' && files[0].type !== 'image/jpg') {
                setError(true);
                setErrorFileMessage('Arquivo inválido. Por favor, selecione um arquivo PDF, PNG, JPEG ou JPG.');
                return;
            } else {
                setError(false);
                setErrorFileMessage('Campo obrigatório.');
            }
            const file = files[0];
            setFile(file);
        }
    };

    const removeFile = () => {
        setFile(null);
        setError(false);
        setErrorFileMessage('Campo obrigatório.');
    };

    const openFileSelector = () => {
        if (!file) {
            fileInputRef.current.click();
        }
    };

    return (
        <div className={`border-2 ${isDragOver ? 'border-blue-500' : 'border-gray-300'} border-dashed p-6 w-full h-48 text-center flex flex-col justify-center items-center rounded-[10px]`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={openFileSelector}>
            <input ref={fileInputRef} type="file" onChange={handleFileSelect} className="hidden" />
            {file ? (
                <div className="flex flex-col items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.502 4.502 0 0 0 2.25 15Z" />
                    </svg>
                    <h4 className="text-sm text-gray-700">Detalhes do arquivo:</h4>
                    <p>Nome: {file.name}</p>
                    <p>Tipo: {file.type}</p>
                    <p>Tamanho: {file.size} bytes</p>
                    <button onClick={removeFile} className="mt-2 px-4 py-1 text-white bg-red-500 rounded hover:bg-red-600">Remover arquivo</button>
                </div>
            ) : isDragOver ? (
                <div class="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9.75v6.75m0 0-3-3m3 3 3-3m-8.25 6a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
                    </svg>
                    <p class="mb-2 text-sm text-gray-500 dark:text-gray-400">
                        <span class="font-semibold">
                            Solte o arquivo aqui
                        </span>
                    </p>
                </div>
            ) : (
                <div class="flex flex-col items-center justify-center pt-5 pb-6">
                    <svg aria-hidden="true" class="w-10 h-10 mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p class="mb-2 text-sm text-gray-500 dark:text-gray-400">
                        <span class="font-semibold">
                            Arraste e solte o arquivo aqui
                        </span>
                    </p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">Arquivos aceitos: PDF, PNG, JPEG, JPG</p>
                </div>
            )}
        </div>
    );
}

export default DragAndDropComponent;
