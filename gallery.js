import { S3Client, ListObjectsV2Command } from "https://esm.sh/@aws-sdk/client-s3?bundle";

// Backblaze B2 Configuration
const B2_CONFIG = {
    region: "us-east-005",
    endpoint: "https://s3.us-east-005.backblazeb2.com",
    credentials: {
        accessKeyId: "005c2b526be0baa0000000032",
        secretAccessKey: "K005KJq+jjzp9+PwkqW7YGmoX3uooVY"
    },
    bucketName: "SAMPLER"
};

const s3Client = new S3Client({
    region: B2_CONFIG.region,
    endpoint: B2_CONFIG.endpoint,
    credentials: B2_CONFIG.credentials,
});

async function loadGallery() {
    const galleryGrid = document.getElementById('gallery-grid'); // Full gallery page
    const previewGrid = document.getElementById('gallery-preview-grid'); // Index page preview
    
    if (!galleryGrid && !previewGrid) return;

    try {
        const command = new ListObjectsV2Command({
            Bucket: B2_CONFIG.bucketName,
        });

        const response = await s3Client.send(command);
        const files = (response.Contents || []).filter(f => f.Key.match(/\.(jpg|jpeg|png|gif|webp)$/i));

        // Sort by last modified (newest first)
        files.sort((a, b) => b.LastModified - a.LastModified);

        if (galleryGrid) {
            renderGrid(galleryGrid, files);
        }
        
        if (previewGrid) {
            renderGrid(previewGrid, files.slice(0, 4)); // Only show top 4
        }

    } catch (error) {
        console.error("Error cargando galería:", error);
        const container = galleryGrid || previewGrid;
        container.innerHTML = `<div class="gallery-empty"><p>Error al cargar fotos.</p></div>`;
    }
}

function renderGrid(container, files) {
    container.innerHTML = '';
    
    if (files.length === 0) {
        container.innerHTML = `
            <div class="gallery-empty">
                <i class="ph ph-image-square"></i>
                <p>Aún no hay fotos disponibles.</p>
            </div>
        `;
        return;
    }

    files.forEach(file => {
        const imgUrl = `${B2_CONFIG.endpoint}/${B2_CONFIG.bucketName}/${file.Key}`;
        const item = document.createElement('div');
        item.className = 'gallery-item reveal';
        item.innerHTML = `
            <img src="${imgUrl}" alt="${file.Key}" loading="lazy">
            <div class="gallery-overlay">
                <span>${file.Key.split('/').pop()}</span>
            </div>
        `;
        container.appendChild(item);
    });
}

document.addEventListener('DOMContentLoaded', loadGallery);
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    loadGallery();
}
