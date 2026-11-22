
const {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails
} = require("@firebase/rules-unit-testing");

const {
  doc,
  setDoc,
  updateDoc,
  Timestamp
} = require("firebase/firestore");

const {
  before,
  after,
  test
} = require("node:test");

const fs = require("node:fs");

let testEnv;

const now = () => Timestamp.now();

before(async () => {
  const rules = fs.readFileSync("firestore.rules", "utf8");

  testEnv = await initializeTestEnvironment({
    projectId: "demo-farmbridge-337f2",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules
    }
  });
});

after(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

// Create trusted test data without applying security rules.
async function seedBase() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await setDoc(doc(db, "users/farmer1"), {
      name: "Test Farmer",
      phone: "9000000001",
      area: "Bankura",
      role: "farmer",
      createdAt: now()
    });

    await setDoc(doc(db, "users/buyer1"), {
      name: "Test Buyer",
      phone: "9000000002",
      area: "Bankura",
      role: "buyer",
      createdAt: now()
    });

    await setDoc(doc(db, "users/outsider"), {
      name: "Outsider",
      phone: "9000000003",
      area: "Bankura",
      role: "buyer",
      createdAt: now()
    });

    await setDoc(doc(db, "listings/lot1"), {
      id: "lot1",
      ownerUid: "farmer1",
      farmerUid: "farmer1",
      farmerName: "Test Farmer",
      farmerPhone: "9000000001",
      crop: "Tomato",
      quantityKg: 100,
      status: "available"
    });

    await setDoc(doc(db, "demands/demand1"), {
      id: "demand1",
      ownerUid: "buyer1",
      buyerUid: "buyer1",
      buyerName: "Test Buyer",
      buyerPhone: "9000000002",
      crop: "Tomato",
      quantityKg: 80,
      status: "open"
    });
  });
}

function buyerEnquiry(quantity = 20) {
  return {
    id: "enquiry1",
    lotId: "lot1",
    demandId: null,
    crop: "Tomato",
    quantityKg: quantity,
    area: "Bankura",
    harvestDate: "2026-12-01",
    buyerUid: "buyer1",
    buyerPhone: "9000000002",
    buyerName: "Test Buyer",
    farmerUid: "farmer1",
    farmerPhone: "9000000001",
    farmerName: "Test Farmer",
    message: "Interested in buying tomatoes",
    initiatorRole: "buyer",
    status: "enquiry",
    history: [
      {
        status: "enquiry",
        at: now(),
        by: "buyer"
      }
    ],
    createdAt: now()
  };
}

function farmerEnquiry(quantity = 20) {
  return {
    id: "enquiry2",
    lotId: "lot1",
    demandId: "demand1",
    crop: "Tomato",
    quantityKg: quantity,
    area: "Bankura",
    harvestDate: "2026-12-01",
    buyerUid: "buyer1",
    buyerPhone: "9000000002",
    buyerName: "Test Buyer",
    farmerUid: "farmer1",
    farmerPhone: "9000000001",
    farmerName: "Test Farmer",
    message: "I can supply your requested tomatoes",
    initiatorRole: "farmer",
    status: "enquiry",
    history: [
      {
        status: "enquiry",
        at: now(),
        by: "farmer"
      }
    ],
    createdAt: now()
  };
}

// Test 1: A farmer can create a valid listing.
test("Farmer can create a valid listing", async () => {
  await seedBase();

  const db = testEnv.authenticatedContext("farmer1").firestore();

  await assertSucceeds(
    setDoc(doc(db, "listings/lot2"), {
      id: "lot2",
      ownerUid: "farmer1",
      farmerUid: "farmer1",
      farmerName: "Test Farmer",
      farmerPhone: "9000000001",
      crop: "Potato",
      quantityKg: 50,
      status: "available"
    })
  );
});

// Test 2: A farmer cannot create a listing with forged identity.
test("Farmer cannot create a listing with forged identity", async () => {
  await seedBase();

  const db = testEnv.authenticatedContext("farmer1").firestore();

  await assertFails(
    setDoc(doc(db, "listings/fake-lot"), {
      ownerUid: "farmer1",
      farmerUid: "farmer1",
      farmerName: "Fake Name",
      farmerPhone: "9999999999",
      crop: "Potato",
      quantityKg: 50,
      status: "available"
    })
  );
});

// Test 3: A buyer can create a valid demand.
test("Buyer can create a valid demand", async () => {
  await seedBase();

  const db = testEnv.authenticatedContext("buyer1").firestore();

  await assertSucceeds(
    setDoc(doc(db, "demands/demand2"), {
      id: "demand2",
      ownerUid: "buyer1",
      buyerUid: "buyer1",
      buyerName: "Test Buyer",
      buyerPhone: "9000000002",
      crop: "Potato",
      quantityKg: 60,
      status: "open"
    })
  );
});

// Test 4: A buyer can create a valid enquiry.
test("Buyer can create a valid enquiry", async () => {
  await seedBase();

  const db = testEnv.authenticatedContext("buyer1").firestore();

  await assertSucceeds(
    setDoc(doc(db, "enquiries/enquiry1"), buyerEnquiry(20))
  );
});

// Test 5: An enquiry exceeding listing quantity is rejected.
test("Buyer cannot enquire for more than listing quantity", async () => {
  await seedBase();

  const db = testEnv.authenticatedContext("buyer1").firestore();

  await assertFails(
    setDoc(doc(db, "enquiries/oversized"), buyerEnquiry(150))
  );
});

// Test 6: A buyer cannot submit forged identity details.
test("Buyer cannot create enquiry with forged identity", async () => {
  await seedBase();

  const db = testEnv.authenticatedContext("buyer1").firestore();

  const enquiry = buyerEnquiry(20);
  enquiry.buyerName = "Fake Buyer";

  await assertFails(
    setDoc(doc(db, "enquiries/forged"), enquiry)
  );
});

// Test 7: A farmer can respond to a matching buyer demand.
test("Farmer can create a valid enquiry against a demand", async () => {
  await seedBase();

  const db = testEnv.authenticatedContext("farmer1").firestore();

  await assertSucceeds(
    setDoc(doc(db, "enquiries/enquiry2"), farmerEnquiry(20))
  );
});

// Test 8: Farmer enquiry cannot exceed buyer demand.
test("Farmer cannot exceed buyer demand quantity", async () => {
  await seedBase();

  const db = testEnv.authenticatedContext("farmer1").firestore();

  await assertFails(
    setDoc(doc(db, "enquiries/too-large"), farmerEnquiry(90))
  );
});

// Test 9: An unrelated user cannot update another farmer's listing.
test("Outsider cannot update another user's listing", async () => {
  await seedBase();

  const db = testEnv.authenticatedContext("outsider").firestore();

  await assertFails(
    updateDoc(doc(db, "listings/lot1"), {
      quantityKg: 500
    })
  );
});

// Test 10: Only the enquiry recipient can start discussion.
test("Enquiry recipient can move enquiry to discussion", async () => {
  await seedBase();

  // Keep the exact original history, including its timestamp.
  const originalEnquiry = buyerEnquiry(20);

  // Create the test enquiry without applying security rules.
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await setDoc(
      doc(db, "enquiries", "enquiry1"),
      originalEnquiry
    );
  });

  // The farmer is the recipient of this buyer-created enquiry.
  const db = testEnv.authenticatedContext("farmer1").firestore();

  await assertSucceeds(
    updateDoc(doc(db, "enquiries", "enquiry1"), {
      status: "discussion",

      // Preserve every original history entry exactly.
      history: [
        ...originalEnquiry.history,
        {
          status: "discussion",
          at: now(),
          by: "farmer"
        }
      ],

      updatedAt: now()
    })
  );
});
// Test 11: An outsider cannot change enquiry status.
test("Outsider cannot update enquiry status", async () => {
  await seedBase();

  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(
      doc(context.firestore(), "enquiries/outsider-test"),
      buyerEnquiry(20)
    );
  });

  const db = testEnv.authenticatedContext("outsider").firestore();

  await assertFails(
    updateDoc(doc(db, "enquiries/outsider-test"), {
      status: "discussion",
      history: [
        ...buyerEnquiry(20).history,
        {
          status: "discussion",
          at: now(),
          by: "farmer"
        }
      ],
      updatedAt: now()
    })
  );
});

// Test 12: An unauthenticated user cannot read a profile.
test("Unauthenticated user cannot read user profiles", async () => {
  await seedBase();

  const db = testEnv.unauthenticatedContext().firestore();

  await assertFails(
    setDoc(doc(db, "users/outsider-copy"), {
      name: "Someone"
    })
  );

  const { getDoc } = require("firebase/firestore");

  await assertFails(
    getDoc(doc(db, "users/farmer1"))
  );
});

test("User cannot change their own role", async () => {
  await seedBase();

  const db = testEnv.authenticatedContext("farmer1").firestore();

  await assertFails(
    updateDoc(doc(db, "users", "farmer1"), {
      role: "buyer"
    })
  );
});

test("User cannot add unauthorized profile fields", async () => {
  await seedBase();

  const db = testEnv.authenticatedContext("farmer1").firestore();

  await assertFails(
    updateDoc(doc(db, "users", "farmer1"), {
      isAdmin: true
    })
  );
});

test("User cannot create a profile with unauthorized fields", async () => {
  const db = testEnv.authenticatedContext("newuser").firestore();

  await assertFails(
    setDoc(doc(db, "users", "newuser"), {
      name: "New User",
      phone: "9000000004",
      area: "Bankura",
      role: "buyer",
      createdAt: now(),
      isAdmin: true
    })
  );
});

test("Farmer cannot set an arbitrary listing status", async () => {
  await seedBase();

  const db = testEnv.authenticatedContext("farmer1").firestore();

  await assertFails(
    updateDoc(doc(db, "listings", "lot1"), {
      status: "admin-approved"
    })
  );
});

test("Buyer cannot set an arbitrary demand status", async () => {
  await seedBase();

  const db = testEnv.authenticatedContext("buyer1").firestore();

  await assertFails(
    updateDoc(doc(db, "demands", "demand1"), {
      status: "admin-approved"
    })
  );
});

test("Enquiry history cannot be modified during a status update", async () => {
  await seedBase();

  const originalEnquiry = buyerEnquiry(20);

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await setDoc(
      doc(db, "enquiries", "enquiry-history-test"),
      originalEnquiry
    );
  });

  const db = testEnv.authenticatedContext("farmer1").firestore();

  await assertFails(
    updateDoc(doc(db, "enquiries", "enquiry-history-test"), {
      status: "discussion",
      history: [
        {
          ...originalEnquiry.history[0],
          by: "farmer"
        },
        {
          status: "discussion",
          at: now(),
          by: "farmer"
        }
      ],
      updatedAt: now()
    })
  );
});
// Test 19: Farmer can update listing through valid statuses.
test("Farmer can update listing through valid statuses", async () => {
  await seedBase();

  const db = testEnv.authenticatedContext("farmer1").firestore();

  await assertSucceeds(
    updateDoc(doc(db, "listings", "lot1"), {
      status: "reserved",
      updatedAt: now()
    })
  );

  await assertSucceeds(
    updateDoc(doc(db, "listings", "lot1"), {
      status: "sold",
      updatedAt: now()
    })
  );
});

// Test 20: Buyer can update demand through valid statuses.
test("Buyer can update demand through valid statuses", async () => {
  await seedBase();

  const db = testEnv.authenticatedContext("buyer1").firestore();

  await assertSucceeds(
    updateDoc(doc(db, "demands", "demand1"), {
      status: "fulfilled",
      updatedAt: now()
    })
  );

  await assertSucceeds(
    updateDoc(doc(db, "demands", "demand1"), {
      status: "closed",
      updatedAt: now()
    })
  );
});