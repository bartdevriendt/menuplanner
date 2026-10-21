# Aan tafel — Menuplanning

Nederlandstalige React-app met Express-API en MySQL-opslag. De catalogus en zelfstandige geplande maaltijden worden centraal opgeslagen. De kalender toont 14 dagen, bladert per 7 dagen en gebruikt Europe/Brussels.

## Lokaal ontwikkelen

Gebruik Node.js 24 (bijvoorbeeld `nvm use 24.13.1`). Maak een eigen MySQL-database aan met een gebruiker die binnen die database tabellen mag maken en gegevens mag lezen/schrijven. MySQL 8 wordt aanbevolen.

1. Kopieer `.env.example` naar `.env` en vul de verbinding en een willekeurige SESSION_SECRET van minimaal 32 tekens in.
2. Voer `npm install` uit.
3. Start de API met `npm run server`.
4. Start in een tweede terminal `npm run dev` en open de getoonde Vite-URL.
5. Maak bij de eerste start het gedeelde account aan. Registratie sluit zodra dat account bestaat.

`npm test` controleert de kalenderberekening en menuvalidatie. `npm run build` bouwt de frontend. `npm start` serveert daarna de gebouwde app (laad daarbij zelf de omgevingsvariabelen, of gebruik lokaal `npm run server`).

## Docker en Portainer

Bouw en publiceer vanuit PowerShell naar de lokale registry (het script stopt bij een mislukte test, build of push):

```powershell
./scripts/publish.ps1
# Optioneel een versie kiezen:
./scripts/publish.ps1 -Tag 1.0.0
```

Stel daarna in Portainer `APP_IMAGE=192.168.3.11:32769/menuplanning:latest` in en haal de nieuwe image op bij het bijwerken van de stack. Het script accepteert ook `-Registry` en `-ImageName`. Meld je zo nodig vooraf aan met `docker login 192.168.3.11:32769`. Als de registry alleen HTTP aanbiedt, voeg `192.168.3.11:32769` toe aan `insecure-registries` in de Docker Engine-configuratie van zowel de buildmachine als de deploymenthost en herstart Docker.

Bouw de image op de Docker-host of in CI:

```sh
docker build -t menuplanning:latest .
```

Maak in Portainer een stack met `compose.yaml`. De image moet op de Docker-host beschikbaar zijn; bij een andere buildmachine publiceer je de image in een registry en stel je APP_IMAGE daarop in. Portainer hoeft geen lokale broncode te bouwen.

Stel DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME en SESSION_SECRET in als stackvariabelen. APP_PORT is standaard 3080. De bestaande MySQL-server moet vanuit de container bereikbaar zijn; `localhost` verwijst binnen de container naar de container zelf.

Laat je reverse proxy HTTPS afhandelen en doorsturen naar poort 3080 van de server. De meegeleverde stack gebruikt beveiligde cookies en vertrouwt precies één proxyhop. Pas TRUST_PROXY aan wanneer je opstelling daarvan afwijkt. Voor tijdelijk direct HTTP-gebruik moet COOKIE_SECURE op false staan. Stel de eerste account in voordat je de applicatie publiek bereikbaar maakt.

De proxy moet de oorspronkelijke `Host` doorgeven en `X-Forwarded-Proto: https` instellen. De app controleert bij wijzigingen of de browser-origin bij die host en dat protocol past.

De container is stateless: account, sessies, menu’s, instelling en planning staan in MySQL. Maak backups van die database. Tabellen krijgen het voorvoegsel `mp_`; de app maakt ze bij opstarten aan zonder bestaande gegevens te verwijderen. Gezondheidscontrole: `/api/health`.

## Gedrag

- Eén maaltijd per dag; elk catalogusmenu wordt bij inplannen gekopieerd.
- Vul per menu ingrediënten in bij Slager en Supermarkt, één ingrediënt per regel zonder hoeveelheden. Ze worden meegekopieerd naar de planning en kunnen daar ook per maaltijd worden aangepast.
- De knop Boodschappenlijst in de planning toont beide winkels voor precies de zichtbare 14 dagen, alfabetisch en met het aantal maaltijden per ingrediënt (bijvoorbeeld 3× rijst). Hoofdletters en dubbele vermeldingen binnen één maaltijd veranderen de telling niet. Dit overzicht is een tijdelijke voorvertoning. Gebruik Kopiëren naar winkellijsten om de ingrediënten op de bewaarde boodschappenlijsten te zetten.
- Via Boodschappen maak je eigen winkels aan en kies je een standaardwinkel. De eerste winkel wordt automatisch standaard. Voeg producten toe, verplaats ze met de winkelkeuze naast het product en vink aan wat in je winkelkar zit. Deze gegevens worden in MySQL bewaard.
- Kopiëren vanuit de tweeweeksplanner voegt onbekende ingrediënten toe aan de standaardwinkel. Bekende ingrediënten blijven bij hun winkel en krijgen opnieuw de status niet in winkelkar. Hoofdletters en overtollige spaties leveren geen dubbele producten op. Zonder winkel vraagt de module eerst om een winkel aan te maken; daarna bevestig je het kopiëren.
- Bestaande menu’s en geplande maaltijden hebben aanvankelijk geen ingrediënten. Vul geplande kopieën via Bewerk in de planning aan; wijzigingen in de catalogus veranderen bestaande kopieën niet.
- Slepen of een doeldatum kiezen verplaatst een maaltijd. Een bezette doeldag wisselt beide maaltijden; de database verwerkt beide wijzigingen in één transactie.
- Bewerk naam, onderdelen en bereidingswijze met Opslaan/Annuleren. Via de maaltijdtitel kun je details openen en een kopie als nieuw catalogusmenu opslaan.
- Verwijderen, vervangen en verplaatsen zijn 12 seconden ongedaan te maken. Dit herstel vervalt bij herladen of een volgende wijziging.
- Verwijderde catalogusmenu’s laten geplande kopieën intact.
- Voor gelijktijdige wijzigingen geldt voorlopig: de laatste opgeslagen wijziging blijft staan.
- Componentensuggesties komen uit de catalogus en bestaande planning. Externe Google Fonts zijn optioneel: zonder verbinding worden systeemlettertypen gebruikt.

## Nog te verifiëren bij deployment

Test de MySQL-verbinding, accountaanmaak en login via de echte HTTPS-proxy. Controleer daarna menu-aanmaak, inplannen, wisselen, ongedaan maken en opnieuw laden op computer en telefoon. Deze integratiecontrole vereist je eigen database en serverconfiguratie.

De vijf tests van `npm test` en de React-productiebuild zijn succesvol uitgevoerd, zowel lokaal (tests) als tijdens de Docker-build. Het image is gepubliceerd naar `192.168.3.11:32769/menuplanning:latest`. De database-integratie en HTTPS-proxy moeten nog op de deploymentomgeving worden gecontroleerd.


De boodschappenmodule is lokaal gecontroleerd met 12 geslaagde tests en een succesvolle productiebuild. De nieuwe tabel `mp_shopping` wordt bij het starten van de server automatisch aangemaakt. De database- en browserintegratie moeten nog op de draaiende omgeving worden gecontroleerd.
