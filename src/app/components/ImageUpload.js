import React from 'react';

const ImageUpload = ({ handleFileSelect }) => {
    return (
        <div>
            <h2>Upload Images</h2>
            <div id="dropArea">
                <p>Drag & Drop Images Here</p>
                <input type="file" id="fileInput" multiple onChange={handleFileSelect} />
            </div>
        </div>
    );
}

export default ImageUpload;
