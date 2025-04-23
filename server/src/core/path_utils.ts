

import { AssetMetaBase } from '@prisma/client';

export const PathUtils = {
    /**
     * Generates a directory path based on asset metadata
     * Following the structure: type/class/location/camera/date
     */
    generatePathFromMetaBase: (asset: AssetMetaBase) => {
        return `${asset.asset_type}/${asset.asset_class}/${asset.asset_location_name}/${asset.asset_camera}/${asset.asset_date_label}`;
    },
    
    /**
     * Generates a filename for an asset based on metadata
     * Format: {type}_{class}_{loc}_{cam}_{date}_{index}
     */
    generateFilename: (asset: AssetMetaBase, index: number, extension: string) => {
        const indexStr = index.toString().padStart(4, '0');
        const shortType = asset.asset_type.substring(0, 3); // vid, img, etc.
        const shortLoc = asset.asset_location_name.replace(/_/g, '').toLowerCase();
        const shortCam = asset.asset_camera.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        
        return `${shortType}_${asset.asset_class}_${shortLoc}_${shortCam}_${asset.asset_date_label}_${indexStr}${extension}`;
    }
}