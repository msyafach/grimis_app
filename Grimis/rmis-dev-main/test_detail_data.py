import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def check():
    try:
        client = AsyncIOMotorClient('mongodb://localhost:27017')
        db = client['your_database_name']
        
        docs = await db.identifikasi_risiko.find({}).to_list(length=1)
        if docs:
            doc = docs[0]
            print("Identifikasi ID:", str(doc['_id']))
            print("Pernyataan:", doc.get('pernyataan_risiko'))
            print("id_konteks_sasaran:", doc.get('id_konteks_sasaran'))
            print("id_konteks_probis:", doc.get('id_konteks_probis'))
            print("id_indikator:", doc.get('id_indikator'))
        else:
            print("No documents found")
    except Exception as e:
        print("Error:", e)

asyncio.run(check())
