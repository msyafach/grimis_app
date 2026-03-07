import urllib.request
import json
import traceback

def main():
    # Login
    req = urllib.request.Request('http://localhost:8000/api/v1/users/login', data=json.dumps({'username': 'admin@example.com', 'password': 'superuser'}).encode('utf-8'))
    req.add_header('Content-Type', 'application/json')
    try:
        with urllib.request.urlopen(req) as res:
            token = json.loads(res.read().decode())['access_token']
        print("Logged in as SUPER_ADMIN")
    except Exception as e:
        print("Login failed:", e)
        return

    # instansi ( Kendari = 699dcd80...bb )
    instansi_id = "699dcd80d509898f729456bb"
    tahunId = '2026'
    
    req3 = urllib.request.Request(f'http://localhost:8000/api/v1/identifikasi-risiko?tahun={tahunId}&id_instansi={instansi_id}')
    req3.add_header('Authorization', f'Bearer {token}')
    with urllib.request.urlopen(req3) as res3:
        idents = json.loads(res3.read().decode())
    
    if not idents:
        print("No Identifikasi Risiko Found")
        return
    
    ident = idents[0]
    print("Found Ident:", ident.get('id'), "->", ident.get('pernyataan_risiko'))

    try:
        # Get sasaran
        konteks_req = urllib.request.Request(f'http://localhost:8000/api/v1/konteks?id_instansi={instansi_id}&jenis=SASARAN')
        konteks_req.add_header('Authorization', f'Bearer {token}')
        with urllib.request.urlopen(konteks_req) as res_k:
            k_sasaran = json.loads(res_k.read().decode())
            filtered = [k for k in k_sasaran if k['id'] == ident.get('id_konteks_sasaran')]
            if filtered:
                print("Sasaran found:", filtered[0]['nama'])
            else:
                print("Sasaran NOT FOUND in full list. ID wanted:", ident.get('id_konteks_sasaran'))
                
        # Get indikator
        ind_req = urllib.request.Request(f"http://localhost:8000/api/v1/indikator?id_konteks={ident.get('id_konteks_sasaran')}&id_instansi={instansi_id}")
        ind_req.add_header('Authorization', f'Bearer {token}')
        with urllib.request.urlopen(ind_req) as res_i:
            inds = json.loads(res_i.read().decode())
            filtered_inds = [i for i in inds if i['id'] == ident.get('id_indikator')]
            if filtered_inds:
                print("Indikator found:", filtered_inds[0]['nama'])
            else:
                print("Indikator NOT FOUND. ID wanted:", ident.get('id_indikator'))
                
        # Get Probis
        probis_req = urllib.request.Request(f'http://localhost:8000/api/v1/konteks?id_instansi={instansi_id}&jenis=PROBIS')
        probis_req.add_header('Authorization', f'Bearer {token}')
        with urllib.request.urlopen(probis_req) as res_p:
            k_probis = json.loads(res_p.read().decode())
            filtered_p = [k for k in k_probis if k['id'] == ident.get('id_konteks_probis')]
            if filtered_p:
                print("Probis found:", filtered_p[0]['nama'])
            else:
                print("Probis NOT FOUND. ID wanted:", ident.get('id_konteks_probis'))
    except Exception as e:
        print("Error during detail fetch:", str(e))

main()
