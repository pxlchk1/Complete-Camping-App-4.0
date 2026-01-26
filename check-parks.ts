import { db } from "./src/config/firebase";
import { collection, getDocs } from "firebase/firestore";

async function checkIllinoisParks() {
  try {
    console.log("=== Checking Firebase Parks Collection ===");

    // First, get ALL parks to see what we have
    const parksCollection = collection(db, "parks");
    const allParksSnapshot = await getDocs(parksCollection);

    console.log(`Total parks in database: ${allParksSnapshot.size}`);

    // Now filter for Illinois
    console.log("\n=== Illinois Parks ===");
    const illinoisParks: any[] = [];
    allParksSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.state && data.state.toLowerCase().includes("illinois")) {
        illinoisParks.push(data);
      }
    });

    console.log(`Total Illinois parks: ${illinoisParks.length}\n`);

    illinoisParks.forEach(park => {
      console.log(`✓ ${park.name}`);
      console.log(`  Address: ${park.address}`);
      console.log(`  State: ${park.state}`);
      console.log(`  Filter: ${park.filter}`);
      console.log(`  Lat/Lng: ${park.latitude}, ${park.longitude}\n`);
    });

  } catch (error) {
    console.error("Error checking parks:", error);
  }
}

checkIllinoisParks();

export {};
