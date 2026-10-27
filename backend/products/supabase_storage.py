import os
import uuid
import requests
from django.conf import settings
from pathlib import Path


def upload_file_to_supabase(file_obj, folder='products'):
    """
    Uploads a file to Supabase Storage.
    Falls back gracefully to local media storage if Supabase credentials
    are invalid or storage RLS denies anon insertion.
    Returns the public URL of the uploaded image.
    """
    supabase_url = getattr(settings, 'SUPABASE_URL', '').rstrip('/')
    supabase_key = getattr(settings, 'SUPABASE_SERVICE_KEY', '')
    bucket = getattr(settings, 'SUPABASE_STORAGE_BUCKET', 'product-images')

    ext = os.path.splitext(getattr(file_obj, 'name', 'file.jpg'))[1].lower() or '.jpg'
    filename = f"{folder}/{uuid.uuid4()}{ext}"

    if hasattr(file_obj, 'read'):
        file_data = file_obj.read()
    else:
        file_data = file_obj

    content_type = getattr(file_obj, 'content_type', 'image/jpeg')

    # 1. Attempt upload to Supabase Storage via REST
    if supabase_url and supabase_key and 'your-project-ref' not in supabase_url:
        try:
            upload_url = f"{supabase_url}/storage/v1/object/{bucket}/{filename}"
            headers = {
                'apikey': supabase_key,
                'Authorization': f'Bearer {supabase_key}',
                'Content-Type': content_type,
                'x-upsert': 'true',
            }
            res = requests.post(upload_url, headers=headers, data=file_data, timeout=8)
            if res.status_code in (200, 201):
                public_url = f"{supabase_url}/storage/v1/object/public/{bucket}/{filename}"
                return public_url
        except Exception:
            pass

    # 2. Local media storage fallback
    local_filename = f"{uuid.uuid4()}{ext}"
    upload_dir = Path(settings.MEDIA_ROOT) / folder
    upload_dir.mkdir(parents=True, exist_ok=True)
    local_path = upload_dir / local_filename

    with open(local_path, 'wb+') as dest:
        dest.write(file_data)

    return f"{settings.MEDIA_URL}{folder}/{local_filename}"

