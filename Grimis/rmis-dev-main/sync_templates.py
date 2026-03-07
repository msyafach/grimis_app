import urllib.request
import urllib.error
import urllib.parse
import json
from datetime import datetime

def main():
    # Login as admin_kendari to get the token
    print("Logging in...")
    data = json.dumps({'username': 'admin_kendari', 'password': 'kendari123'}).encode('utf-8')
    req = urllib.request.Request('http://localhost:8000/api/v1/users/login', data=data)
    req.add_header('Content-Type', 'application/json')
    try:
        with urllib.request.urlopen(req) as response:
            token = json.loads(response.read().decode())['access_token']
    except Exception as e:
        print("Login failed:", e)
        return

    # Get Instansi ID
    req2 = urllib.request.Request('http://localhost:8000/api/v1/instansi')
    req2.add_header('Authorization', f'Bearer {token}')
    with urllib.request.urlopen(req2) as response2:
        instansi_data = json.loads(response2.read().decode())
        instansi_id = instansi_data[0]['id']

    # Get All Induk Unit Kerja
    req3 = urllib.request.Request(f'http://localhost:8000/api/v1/induk-unit-kerja/all/{instansi_id}')
    req3.add_header('Authorization', f'Bearer {token}')
    with urllib.request.urlopen(req3) as response3:
        all_units = json.loads(response3.read().decode())['induk_unit_kerja']

    current_year = datetime.now().year

    for unit in all_units:
        unit_id = unit['id']
        unit_name = unit.get('name') or unit.get('nama_induk_unit')
        print(f"Checking {unit_name} ({unit_id})...")

        # 1. Create Template
        try:
            req_tmpl = urllib.request.Request(
                f'http://localhost:8000/api/v1/peta-risiko/template/generate?tahun={current_year}&id_instansi={instansi_id}&id_induk_unit_kerja={unit_id}',
                data=b'{}'  # Need data to force POST
            )
            req_tmpl.add_header('Authorization', f'Bearer {token}')
            req_tmpl.add_header('Content-Type', 'application/json')
            
            with urllib.request.urlopen(req_tmpl) as response_tmpl:
                tmpl_data = json.loads(response_tmpl.read().decode())
                template_id = tmpl_data['id']
                print(f"  -> Created Template {template_id}")

            # 2. Sync Kriteria Risiko from Template
            req_sync = urllib.request.Request(
                f'http://localhost:8000/api/v1/kriteria-risiko/sync-from-template?id_instansi={instansi_id}&id_induk_unit_kerja={unit_id}&template_id={template_id}',
                data=b'{}'
            )
            req_sync.add_header('Authorization', f'Bearer {token}')
            req_sync.add_header('Content-Type', 'application/json')
            with urllib.request.urlopen(req_sync) as res_sync:
                print(f"  -> Synced Kriteria Risiko")

            # 3. Update Frequency Categories
            req_freq = urllib.request.Request(
                f'http://localhost:8000/api/v1/peta-risiko/kategori?template_id={template_id}&jenis=FREKUENSI'
            )
            req_freq.add_header('Authorization', f'Bearer {token}')
            with urllib.request.urlopen(req_freq) as res_freq:
                freq_list = json.loads(res_freq.read().decode())
                
            labels = ['Sangat Kecil', 'Kecil', 'Sedang', 'Besar', 'Sangat Besar']
            for idx, f in enumerate(freq_list):
                if idx < 5:
                    f['value'] = labels[idx]
                    req_upd = urllib.request.Request(
                        f'http://localhost:8000/api/v1/peta-risiko/kategori/{f["id"]}',
                        data=json.dumps(f).encode('utf-8'),
                        method='PUT'
                    )
                    req_upd.add_header('Authorization', f'Bearer {token}')
                    req_upd.add_header('Content-Type', 'application/json')
                    urllib.request.urlopen(req_upd)
            print("  -> Updated Frequency Labels")

            # 4. Update Impact Categories
            req_imp = urllib.request.Request(
                f'http://localhost:8000/api/v1/peta-risiko/kategori?template_id={template_id}&jenis=DAMPAK'
            )
            req_imp.add_header('Authorization', f'Bearer {token}')
            with urllib.request.urlopen(req_imp) as res_imp:
                imp_list = json.loads(res_imp.read().decode())
                
            imp_labels = ['TIDAK SIGNIFIKAN', 'MINOR', 'MEDIUM', 'SIGNIFIKAN', 'SANGAT SIGNIFIKAN']
            for idx, i in enumerate(imp_list):
                if idx < 5:
                    i['value'] = imp_labels[idx]
                    req_upd = urllib.request.Request(
                        f'http://localhost:8000/api/v1/peta-risiko/kategori/{i["id"]}',
                        data=json.dumps(i).encode('utf-8'),
                        method='PUT'
                    )
                    req_upd.add_header('Authorization', f'Bearer {token}')
                    req_upd.add_header('Content-Type', 'application/json')
                    urllib.request.urlopen(req_upd)
            print("  -> Updated Impact Labels")
            print("  ✔ Unit completed")
            
        except urllib.error.HTTPError as e:
            if e.code == 400 and "exists" in e.read().decode():
                print(f"  -> Template already exists, skipping...")
            else:
                print(f"  -> Error for unit: {e}")
        except Exception as e:
            print(f"  -> Unknown error: {e}")

if __name__ == "__main__":
    main()
