# MealCare

Integrating FHIR resources into a meal planning and diet tracking web application.

**CS 6440 Health Informatics, Team 113**



## Tech Stack

- **Frontend:** TypeScript 
- **Backend:** Node.js 
- **Database:** PostgreSQL/Prisma
- **FHIR Server:** HAPI FHIR through Docker
- **Synthetic FHIR Patient Data:** Synthea


## Prerequisites

- **Node.js** [nodejs.org](https://nodejs.org)
- **PostgreSQL** 14+ Install via [Homebrew](https://brew.sh): `brew install postgresql@14`
- **Docker**  [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
- **Java**  https://www.java.com/en/download/ (only needed for Synthea)
- **Git** https://git-scm.com/
- **Optional:** PgAdmin for database management: https://www.pgadmin.org/download/


### Clone the Repository

```bash
git clone https://github.com/LeonardoGalan/MealCare.git
cd MealCare
```

### Install Dependencies

```bash
cd server
npm install
```

### Set Up PostgreSQL

Start PostgreSQL if it isn't already running:

```bash
brew services start postgresql@14
```

Create the database:

```bash
createdb mealcare
```


Add an .env file within the server folder and set your database URL.

```
DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/mealcare"
```


###  Run Prisma Migration

Create all the database tables:

```bash
cd server
npx prisma migrate dev --name init
npx prisma generate
```


###  Set Up HAPI FHIR Server

Make sure Docker is installed and running, then pull the latest HAPI FHIR image:

```bash
docker run -d -p 8080:8080 --name hapi-fhir hapiproject/hapi:latest
```

Verify that it is running by visiting:

```
http://localhost:8080/
```


### Generate and POST Synthea Patients to the FHIR Server

Clone the Synthea repo and generate 1-3 synthetic patient bundles:

```bash
cd ~
git clone https://github.com/synthetichealth/synthea.git
cd synthea
./run_synthea -p 3
```

Upload the hospital/practitioner data first, then 3 patient bundles to the FHIR server:

```bash
cd ~/synthea/output/fhir

# POST hospital and practitioner info before patient bundles
curl -s -X POST http://localhost:8080/fhir -H "Content-Type: application/fhir+json" -d @hospitalInformation*.json > /dev/null
curl -s -X POST http://localhost:8080/fhir -H "Content-Type: application/fhir+json" -d @practitionerInformation*.json > /dev/null

# POST 3 patient bundles
count=0
for f in *.json; do
  if [[ "$f" == hospital* ]] || [[ "$f" == practitioner* ]]; then
    continue
  fi
  curl -s -X POST http://localhost:8080/fhir -H "Content-Type: application/fhir+json" -d @"$f" > /dev/null
  count=$((count + 1))
  if [ $count -eq 3 ]; then
    break
  fi
done
echo "Uploaded $count patients"
```

Verify if the patient bundles were loaded:

```bash
curl -s "http://localhost:8080/fhir/Patient?_format=json" | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(f'Total patients: {data.get(\"total\", 0)}')
for entry in data.get('entry', []):
    r = entry['resource']
    name = r.get('name', [{}])[0]
    first = ' '.join(name.get('given', []))
    last = name.get('family', '')
    print(f'  ID: {r[\"id\"]}  Name: {first} {last}')
"

