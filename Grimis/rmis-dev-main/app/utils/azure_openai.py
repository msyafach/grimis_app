import os
import json
import uuid
from typing import List, Dict, Any, Optional
from decouple import config
from fastapi import HTTPException
from openai import AzureOpenAI
import logging

# Azure OpenAI Configuration
AZURE_OPENAI_ENDPOINT = config('AZURE_OPENAI_ENDPOINT')
AZURE_OPENAI_API_KEY = config('AZURE_OPENAI_API_KEY')
AZURE_OPENAI_DEPLOYMENT_NAME = config('AZURE_OPENAI_DEPLOYMENT_NAME')
AZURE_OPENAI_API_VERSION = config('AZURE_OPENAI_API_VERSION')

# In-memory storage for generated risk statements
# Structure: {generation_id: [risk_statements]}
GENERATED_STATEMENTS = {}

# Initialize the Azure OpenAI client
client = AzureOpenAI(
    api_key=AZURE_OPENAI_API_KEY,
    azure_endpoint=AZURE_OPENAI_ENDPOINT,
    api_version=AZURE_OPENAI_API_VERSION
)

async def generate_risk_statements(
    nama_sasaran: str,
    konteks_sasaran: str,
    indikator: str,
    konteks_probis: str,
    count: int = 5
) -> Dict[str, Any]:
    """
    Generate risk statements using Azure OpenAI based on the provided context
    
    Args:
        nama_sasaran: Name of the target/goal type
        konteks_sasaran: Specific target/goal context
        indikator: Indicator
        konteks_probis: Business process context
        count: Number of risk statements to generate (default: 5)
        
    Returns:
        Dictionary with generation_id and list of generated risk statements
    """
    # Generate a unique ID for this generation session
    generation_id = str(uuid.uuid4())
    statements = []
    
    # Prompt for normal risk statements
    normal_prompt = f"""
    Sebagai seorang ahli manajemen risiko, buatlah {count} pernyataan risiko operasional yang berbeda dan singkat (maksimal 15 kata) berdasarkan konteks berikut:
    
    Jenis Sasaran: {nama_sasaran}
    Sasaran Spesifik: {konteks_sasaran}
    Indikator: {indikator}
    Konteks Proses Bisnis: {konteks_probis}
    
    Ingat, risiko adalah single event yang mengganggu proses bisnis {konteks_probis}, dimana kegagalan proses bisnis akan menggangu ketercapaian sasaran {konteks_sasaran} dan indikator. Risiko tidak boleh berupa negasi dari sasaran.

    Pernyataan harus menggambarkan potensi kejadian yang mengganggu proses bisnis, yang nantinya berakibat juga pada pencapaian sasaran. Pastikan pernyataan tersebut:
    1. Singkat dan jelas.
    2. Pernyataan risiko hanya berupa "[kejadian yang tidak diinginkan]" saja. 
    3. Tidak mengandung detail yang tidak relevan.
    4. Pernyataan risiko TIDAK BOLEH merupakan kalimat majemuk.
    5. DILARANG menggunakan kata penghubung/penyebab: dan, atau, dalam, tetapi, namun, karena, sehingga, jika, apabila, meskipun, lalu, kemudian, padahal, akibat, agar, supaya, untuk, saat, ketika, setelah, sebelum.
    6. Buat TEPAT {count} risiko operasional normal (bukan fraud).
    
    Berikan output dalam format JSON dengan struktur berikut:
    {{
        "statements": [
            {{
                "pernyataan": "Pernyataan risiko operasional yang singkat",
                "deskripsi": "Deskripsi singkat tentang pernyataan dan dampaknya",
                "tag": "NORMAL"
            }},
            ...
        ]
    }}
    
    Pastikan output hanya berisi JSON yang valid tanpa teks tambahan.
    """
    
    # Prompt for fraud risk statements
    fraud_prompt = f"""
    Sebagai seorang ahli manajemen risiko, buatlah 2 pernyataan risiko fraud yang berbeda dan singkat (maksimal 15 kata) berdasarkan konteks berikut:
    
    Jenis Sasaran: {nama_sasaran}
    Sasaran Spesifik: {konteks_sasaran}
    Indikator: {indikator}
    Konteks Proses Bisnis: {konteks_probis}
    
    Ingat, risiko adalah single event yang mengganggu proses bisnis {konteks_probis}, dimana kegagalan proses bisnis akan menggangu ketercapaian sasaran {konteks_sasaran} dan indikator. Risiko tidak boleh berupa negasi dari sasaran.

    Pernyataan harus menggambarkan potensi kejadian yang mengganggu proses bisnis, yang nantinya berakibat juga pada pencapaian sasaran. Pastikan pernyataan tersebut:
    1. Singkat dan jelas.
    2. Pernyataan risiko hanya berupa "[kejadian yang tidak diinginkan]" saja. 
    3. Tidak mengandung detail yang tidak relevan.
    4. Pernyataan risiko TIDAK BOLEH merupakan kalimat majemuk.
    5. DILARANG menggunakan kata penghubung/penyebab: dan, atau, dalam, tetapi, namun, karena, sehingga, jika, apabila, meskipun, lalu, kemudian, padahal, akibat, agar, supaya, untuk, saat, ketika, setelah, sebelum.
    6. Buat TEPAT 2 risiko fraud.
    
    Untuk risiko fraud, gunakan kosakata yang spesifik terkait dengan kecurangan finansial atau perilaku tidak etis seperti:
    - Pemalsuan (dokumen, data, laporan)
    - Penggelapan (dana, aset)
    - Penyuapan / Suap
    - Manipulasi (data, angka, dokumen)
    - Penyalahgunaan (wewenang, akses, dana, aset)
    - Markup (harga, nilai kontrak)
    - Kolusi
    - Korupsi
    - Gratifikasi ilegal
    - Pencurian (informasi, aset)
    - Transaksi fiktif
    
    PENTING: Risiko fraud HARUS berkaitan langsung dengan proses bisnis "{konteks_probis}" dan aktivitas-aktivitasnya. Fraud harus merupakan tindakan tidak jujur/ilegal yang terjadi dalam konteks proses bisnis tersebut, yang dapat mengakibatkan kerugian finansial, reputasi, atau mengganggu pencapaian sasaran "{konteks_sasaran}".

    Berikan output dalam format JSON dengan struktur berikut:
    {{
        "statements": [
            {{
                "pernyataan": "Pernyataan risiko fraud yang spesifik",
                "deskripsi": "Deskripsi tentang dampak risiko fraud tersebut",
                "tag": "FRAUD"
            }},
            ...
        ]
    }}
    
    Pastikan output hanya berisi JSON yang valid tanpa teks tambahan.
    """
    
    try:
        # Generate normal risk statements
        normal_response = client.chat.completions.create(
            model=AZURE_OPENAI_DEPLOYMENT_NAME,
            messages=[
                {"role": "system", "content": "You are a risk management expert assistant specialized in operational risk identification."},
                {"role": "user", "content": normal_prompt}
            ],
            temperature=0.3,
            max_tokens=1000
        )
        
        # Generate fraud risk statements
        fraud_response = client.chat.completions.create(
            model=AZURE_OPENAI_DEPLOYMENT_NAME,
            messages=[
                {"role": "system", "content": "You are a risk management expert assistant specialized in fraud risk identification."},
                {"role": "user", "content": fraud_prompt}
            ],
            temperature=0.3,
            max_tokens=500
        )
        
        # Process normal response
        normal_content = normal_response.choices[0].message.content
        normal_result = parse_json_response(normal_content)
        
        # Process fraud response
        fraud_content = fraud_response.choices[0].message.content
        fraud_result = parse_json_response(fraud_content)
        
        # Combine and process statements
        for statement in normal_result.get("statements", []):
            statement_id = str(uuid.uuid4())
            statements.append({
                "id": statement_id,
                "pernyataan": statement.get("pernyataan", ""),
                "deskripsi": statement.get("deskripsi", ""),
                "tag": "NORMAL"
            })
            
        for statement in fraud_result.get("statements", []):
            statement_id = str(uuid.uuid4())
            statements.append({
                "id": statement_id,
                "pernyataan": statement.get("pernyataan", ""),
                "deskripsi": statement.get("deskripsi", ""),
                "tag": "FRAUD"
            })
        
        # Store the generated statements in memory
        GENERATED_STATEMENTS[generation_id] = statements
        
        return {
            "generation_id": generation_id,
            "statements": statements
        }
        
    except Exception as e:
        logging.error(f"Error generating risk statements: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating risk statements: {str(e)}")

# Helper function to parse JSON from OpenAI response
def parse_json_response(content: str) -> Dict:
    """Parse JSON from OpenAI response text"""
    try:
        result = json.loads(content)
        return result
    except json.JSONDecodeError:
        # If the response is not valid JSON, try to extract JSON from the text
        start_idx = content.find('{')
        end_idx = content.rfind('}') + 1
        if start_idx >= 0 and end_idx > start_idx:
            json_str = content[start_idx:end_idx]
            try:
                return json.loads(json_str)
            except json.JSONDecodeError:
                # If still not valid, return an empty result
                return {"statements": []}
        else:
            return {"statements": []}

def generate_root_causes(
    jenis_konteks_sasaran: str,
    pernyataan_risiko: str
) -> Dict[str, Any]:
    """
    Generate root causes for a risk using Azure OpenAI
    
    Args:
        jenis_konteks_sasaran: Context about the target/objective
        pernyataan_risiko: Risk statement text
        
    Returns:
        Dict containing generation_id and list of potential root causes
    """
    # Generate a unique ID for this generation session
    generation_id = str(uuid.uuid4())
    
    # Construct the prompt for root cause analysis
    prompt = f"""
    Buat bowtie analysis untuk risiko berikut dengan masing-masing 3 penyebab dan 3 dampak beserta pengendaliannya.
    Tolong urutkan dari pengendalian yang paling murah namun paling berdampak.
    
    - Sasaran/Konteks: {jenis_konteks_sasaran}
    - Pernyataan Risiko: {pernyataan_risiko}
    
    Format respons dalam bentuk JSON dengan struktur berikut:
    
    {{
        "penyebab": [
            {{
                "deskripsi": "Deskripsi penyebab 1",
                "pengendalian": "Rekomendasi pengendalian untuk penyebab 1",
                "jenis_pengendalian": "Mengurangi kemungkinan"
            }},
            {{
                "deskripsi": "Deskripsi penyebab 2",
                "pengendalian": "Rekomendasi pengendalian untuk penyebab 2",
                "jenis_pengendalian": "Mengurangi kemungkinan"
            }},
            {{
                "deskripsi": "Deskripsi penyebab 3",
                "pengendalian": "Rekomendasi pengendalian untuk penyebab 3",
                "jenis_pengendalian": "Mengurangi kemungkinan"
            }}
        ],
        "dampak": [
            {{
                "deskripsi": "Deskripsi dampak 1",
                "pengendalian": "Rekomendasi pengendalian untuk dampak 1",
                "jenis_pengendalian": "Mengurangi dampak"
            }},
            {{
                "deskripsi": "Deskripsi dampak 2",
                "pengendalian": "Rekomendasi pengendalian untuk dampak 2",
                "jenis_pengendalian": "Mengurangi dampak"
            }},
            {{
                "deskripsi": "Deskripsi dampak 3",
                "pengendalian": "Rekomendasi pengendalian untuk dampak 3",
                "jenis_pengendalian": "Mengurangi dampak"
            }}
        ]
    }}
    
    Pastikan respons hanya berupa JSON yang valid, tanpa teks tambahan di awal atau akhir.
    """
    
    try:
        # Call Azure OpenAI using the global client
        response = client.chat.completions.create(
            model=AZURE_OPENAI_DEPLOYMENT_NAME,
            messages=[
                {"role": "system", "content": "Anda adalah analis risiko profesional yang ahli dalam analisis bowtie untuk manajemen risiko. Selalu berikan respons dalam format JSON yang diminta."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1000
        )
        
        # Process the response
        content = response.choices[0].message.content
        
        # Parse the JSON from the response using the helper function
        result = parse_json_response(content)
        if not result or (not result.get("penyebab") and not result.get("dampak")):
            # If no valid result, return a formatted error message
            result = {
                "penyebab": [{"deskripsi": "Gagal mengekstrak penyebab. Silakan coba lagi.", "pengendalian": "", "jenis_pengendalian": "Mengurangi kemungkinan"}],
                "dampak": [{"deskripsi": "Gagal mengekstrak dampak. Silakan coba lagi.", "pengendalian": "", "jenis_pengendalian": "Mengurangi dampak"}]
            }
        
        # Generate unique IDs for each cause and impact
        root_causes = []
        
        # Process penyebab (causes)
        for idx, cause in enumerate(result.get("penyebab", [])):
            root_cause_id = str(uuid.uuid4())
            formatted_cause = {
                "id": root_cause_id,
                "jenis": "penyebab",
                "deskripsi": cause.get("deskripsi", ""),
                "pengendalian": cause.get("pengendalian", ""),
                "jenis_pengendalian": cause.get("jenis_pengendalian", "Mengurangi kemungkinan")
            }
            root_causes.append(formatted_cause)
        
        # Process dampak (impacts)
        for idx, impact in enumerate(result.get("dampak", [])):
            root_cause_id = str(uuid.uuid4())
            formatted_impact = {
                "id": root_cause_id,
                "jenis": "dampak",
                "deskripsi": impact.get("deskripsi", ""),
                "pengendalian": impact.get("pengendalian", ""),
                "jenis_pengendalian": impact.get("jenis_pengendalian", "Mengurangi dampak")
            }
            root_causes.append(formatted_impact)
        
        # If no causes or impacts were found, create default ones
        if not root_causes:
            root_causes = [
                {
                    "id": str(uuid.uuid4()),
                    "jenis": "penyebab",
                    "deskripsi": "Tidak dapat mengidentifikasi penyebab yang spesifik. Silakan coba dengan pernyataan risiko yang lebih detail.",
                    "pengendalian": "",
                    "jenis_pengendalian": "Mengurangi kemungkinan"
                },
                {
                    "id": str(uuid.uuid4()),
                    "jenis": "dampak",
                    "deskripsi": "Tidak dapat mengidentifikasi dampak yang spesifik. Silakan coba dengan pernyataan risiko yang lebih detail.",
                    "pengendalian": "",
                    "jenis_pengendalian": "Mengurangi dampak"
                }
            ]
        
        # Store in the global dictionary
        GENERATED_STATEMENTS[generation_id] = root_causes
        
        return {
            "generation_id": generation_id,
            "root_causes": root_causes
        }
        
    except Exception as e:
        logging.error(f"Error generating root causes: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate root causes: {str(e)}"
        )

def get_selected_statements(generation_id: str, selected_ids: List[str]) -> List[Dict[str, Any]]:
    """
    Get selected risk statements from a generation session
    
    Args:
        generation_id: ID of the generation session
        selected_ids: List of selected statement IDs
        
    Returns:
        List of selected risk statements
    """
    if generation_id not in GENERATED_STATEMENTS:
        raise HTTPException(status_code=404, detail="Generation session not found")
    
    statements = GENERATED_STATEMENTS[generation_id]
    selected_statements = [s for s in statements if s["id"] in selected_ids]
    
    # Clean up statements that were not selected
    GENERATED_STATEMENTS[generation_id] = selected_statements
    
    return selected_statements

def cleanup_generation_session(generation_id: str) -> None:
    """
    Clean up a generation session
    
    Args:
        generation_id: ID of the generation session to clean up
    """
    if generation_id in GENERATED_STATEMENTS:
        del GENERATED_STATEMENTS[generation_id] 