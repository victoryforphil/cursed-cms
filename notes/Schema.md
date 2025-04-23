# Schemas

## Asset (Base Info)
- `asset` 
    - `uuid`: String that is  a unique Identifer
    - `imported_fullpath`: Original path / filename when imported
    - `imported_filename`: Original filename
    - `stored_fullpath`: Stored path (relative in the file store)
    - `stored_url`: Stored URL
    - `size`: Size in bytes
    - `stored_filename`: Stored filename (after renaming)
    - `extension`: File extension
    - `hash`: Optional<String> Hash of the file 
    - `uploaded_at`: Uploaded Date
    - `meta_base`: Relation: `asset_meta_base`


## Base Asset Metadata
- `asset_meta_base`
    - `asset_type` string
    - `asset_class`: string
    - `asset_location_name`: string
    - `asset_camera`: string
    - `asset_date_label`: String
