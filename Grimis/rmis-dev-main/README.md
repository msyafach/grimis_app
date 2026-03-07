# GRIMIS (Government Risk Management Information System)

Backend API untuk sistem manajemen risiko pemerintahan dengan FastAPI dan MongoDB.

## Fitur

- Autentikasi JWT dengan durasi 24 jam
- Role-based access control (RBAC)
- Manajemen User dengan 6 role:
  - Super Admin
  - Admin KLP
  - Pemilik Risiko
  - Pengelola Risiko
  - Pengawas Intern
  - Pegawai
- Manajemen Instansi
- Manajemen Induk Unit Kerja
- Manajemen Struktur Organisasi
- Manajemen Kategori Risiko
- Manajemen Jenis Konteks (SASARAN/PROBIS)
- Manajemen Jenis Penyebab
- Manajemen Konteks dan Indikator
  - Konteks SASARAN dapat memiliki indikator
  - Konteks PROBIS tidak memiliki indikator

## Teknologi

- FastAPI
- MongoDB (dengan Motor)
- JWT Authentication
- Python 3.8+

## Struktur Organisasi

### Endpoints
- `POST /api/v1/struktur-organisasi` - Buat struktur organisasi baru
- `GET /api/v1/struktur-organisasi` - Get semua struktur organisasi per instansi
- `GET /api/v1/struktur-organisasi/{id}` - Get detail struktur organisasi
- `PUT /api/v1/struktur-organisasi/{id}` - Update struktur organisasi
- `DELETE /api/v1/struktur-organisasi/{id}` - Hapus struktur organisasi
- `POST /api/v1/struktur-organisasi/check-email` - Cek email user
- `POST /api/v1/struktur-organisasi/assign-user-by-email` - Assign user ke struktur
- `GET /api/v1/struktur-organisasi/{id}/users` - Get users dalam struktur
- `DELETE /api/v1/struktur-organisasi/{id}/users/{user_id}` - Remove user dari struktur

## Manajemen Risiko

### Kategori Risiko
- CRUD Kategori Risiko per KLP
- Kode unik per instansi
- SUPER_ADMIN dapat membuat untuk semua KLP
- ADMIN_KLP hanya dapat membuat untuk KLP mereka

### Jenis Konteks
- CRUD Jenis Konteks (SASARAN/PROBIS) per KLP
- Kode unik per instansi
- SUPER_ADMIN dapat membuat untuk semua KLP
- ADMIN_KLP hanya dapat membuat untuk KLP mereka

### Jenis Penyebab
- CRUD Jenis Penyebab per KLP
- Kode unik per instansi
- SUPER_ADMIN dapat membuat untuk semua KLP
- ADMIN_KLP hanya dapat membuat untuk KLP mereka

### Konteks dan Indikator
- CRUD Konteks (SASARAN/PROBIS)
- CRUD Indikator untuk Konteks SASARAN
- Konteks PROBIS tidak memiliki indikator
- Kode unik per instansi untuk Konteks
- Kode unik per Konteks untuk Indikator
- Total indikator dihitung otomatis untuk Konteks SASARAN

### Selera Risiko
Nilai selera risiko antara 1-5:
1. Sangat Rendah
2. Rendah  
3. Sedang
4. Tinggi
5. Sangat Tinggi

## Risk Statement Generation Feature

The system now includes a feature to automatically generate risk statements using Azure OpenAI. This feature helps users create high-quality risk statements based on organizational context.

### How It Works

1. **Generate Risk Statements**
   - The system uses the official Azure OpenAI SDK to generate risk statements based on:
     - Jenis Sasaran (Target Type) - retrieved from the organizational structure
     - Konteks Sasaran (Specific Target) - the actual target context
     - Indikator (Indicator)
     - Konteks Probis (Business Process Context)
   - The system automatically fetches the actual names and descriptions from the database using the provided IDs
   - Users can specify how many risk statements they want to generate (default: 5)
   - The generated statements follow the format: "Risiko [kejadian yang tidak diinginkan] pada [aktivitas/proses] yang menyebabkan [dampak]"

2. **Select Risk Statements**
   - Users can review the generated statements and select which ones to use
   - Only selected statements are saved, others are discarded

3. **Use in Risk Identification**
   - Users can directly use the generated statements when creating risk identifications
   - Two methods are supported:
     - Manual: Provide the `pernyataan_risiko` field directly in the request
     - AI-assisted: Provide only the `generation_id` and `statement_id` fields, and the system will automatically populate the `pernyataan_risiko` and `deskripsi` fields from the selected AI-generated statement
   - When using AI-assisted mode, the `pernyataan_risiko` field is not required in the request as it will be automatically populated

4. **Cleanup**
   - The system automatically cleans up temporary data after selection

### API Endpoints

- `POST /api/v1/identifikasi-risiko/generate-statements`: Generate risk statements using context IDs
- `POST /api/v1/identifikasi-risiko/select-statements`: Select which statements to use
- `POST /api/v1/identifikasi-risiko`: Create risk identification (supports both manual and AI-assisted modes)
- `DELETE /api/v1/identifikasi-risiko/cleanup-generation/{generation_id}`: Clean up temporary data

## Setup

1. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Configure environment variables in `.env`:
   ```
   MONGODB_URL=your_mongodb_connection_string
   DB_NAME=your_database_name
   JWT_SECRET_KEY=your_jwt_secret
   
   # Azure OpenAI Configuration
   AZURE_OPENAI_ENDPOINT=your_azure_openai_endpoint
   AZURE_OPENAI_API_KEY=your_azure_openai_api_key
   AZURE_OPENAI_DEPLOYMENT_NAME=your_azure_openai_deployment_name
   AZURE_OPENAI_API_VERSION=your_azure_openai_api_version
   ```

3. Run the application:
   ```
   uvicorn app.main:app --reload
   ```

## API Documentation

Once the application is running, you can access the API documentation at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Deployment ke Render

Aplikasi ini dapat di-deploy dengan mudah ke platform [Render](https://render.com).

### Persiapan Deployment

1. **Push repository ke GitHub atau GitLab**
   - Pastikan repository di-push ke GitHub atau GitLab
   - Jika menggunakan private repository, Anda perlu menghubungkannya dengan akun Render

2. **Buat Service Baru di Render**
   - Login ke dashboard Render
   - Pilih "New" > "Web Service"
   - Hubungkan dengan repository GitHub/GitLab Anda
   - Pilih branch yang ingin di-deploy (biasanya `main`)

3. **Konfigurasi Service**
   - Nama: `rmis-api` (atau nama lain sesuai keinginan)
   - Region: Singapore (atau region terdekat dengan pengguna)
   - Branch: `main` (atau branch lain yang diinginkan)
   - Runtime: `Python`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`

4. **Konfigurasi Environment Variables**
   - Tambahkan semua variabel yang ada di file `.env.example`
   - Pastikan untuk mengisi nilai yang sebenarnya untuk credential database, API key, dll
   - Render akan otomatis menyediakan variabel `PORT`

5. **Deploy**
   - Klik "Create Web Service"
   - Render akan memulai proses deployment dan memberikan URL untuk akses aplikasi

### Menggunakan render.yaml

Alternatif, Anda dapat menggunakan file `render.yaml` yang sudah disediakan:

1. Login ke Render dashboard
2. Pergi ke "Blueprints"
3. Klik "New Blueprint"
4. Hubungkan dengan repository Anda
5. Render akan secara otomatis mengkonfigurasi service berdasarkan file `render.yaml`
6. Isi variabel environment yang diperlukan (yang ditandai `sync: false`)
7. Klik "Apply" untuk memulai deployment

### Pemeliharaan dan Update

- Setiap push ke branch yang terhubung akan memicu deployment otomatis
- Anda dapat mematikan auto-deploy di pengaturan service
- Log aplikasi dan metrics tersedia di dashboard Render

### Catatan Penting

- Render menawarkan free tier dengan batas CPU dan memory tertentu
- Free tier memiliki masa idle (tidak digunakan) setelah beberapa waktu, layanan akan sleep
- Untuk produksi, disarankan menggunakan paid plan agar layanan selalu aktif
