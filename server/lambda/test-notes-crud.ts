/**
 * Automated end-to-end verification script for Notes CRUD flow.
 * Tests create, read, update, and delete against real PostgreSQL through 127.0.0.1:5433 tunnel.
 */
import {
  getNotesHandler,
  createNoteHandler,
  updateNoteHandler,
  deleteNoteHandler,
  closePool,
} from "./index";

async function runNotesCrudTest() {
  console.log("=================================================");
  console.log("  Testing Real Notes CRUD & Database Persistence ");
  console.log("=================================================\n");

  const customerUuid = "68c25624-2c0d-41ed-a2c0-0f503ac73033"; // Superblock HQ
  const testTitle = `Automated Test Note - ${Date.now()}`;
  const testContent = `This is a test note to verify real PostgreSQL persistence at ${new Date().toISOString()}`;

  // 1. CREATE NOTE
  console.log("[Step 1] Creating a new customer note...");
  const createResult = await createNoteHandler({
    httpMethod: "POST",
    path: "/notes",
    body: JSON.stringify({
      customerId: customerUuid,
      title: testTitle,
      content: testContent,
    }),
  });

  if (createResult.statusCode !== 201) {
    console.error("❌ createNoteHandler failed:", createResult.statusCode, createResult.body);
    process.exit(1);
  }

  const createBody = JSON.parse(createResult.body);
  const createdNote = createBody.note;
  console.log("✅ Note created successfully with ID:", createdNote.id);
  console.log("   Title:", createdNote.title);
  console.log("   Content:", createdNote.content);
  console.log("   Created At:", createdNote.created_at);

  const noteId = createdNote.id;

  // 2. READ NOTES (GET)
  console.log("\n[Step 2] Fetching notes for customer to verify persistence...");
  const getResult = await getNotesHandler({
    httpMethod: "GET",
    path: "/notes",
    queryStringParameters: { customerId: customerUuid },
  });

  if (getResult.statusCode !== 200) {
    console.error("❌ getNotesHandler failed:", getResult.statusCode, getResult.body);
    process.exit(1);
  }

  const getBody = JSON.parse(getResult.body);
  const fetchedNote = getBody.notes.find((n: any) => n.id === noteId);
  if (!fetchedNote) {
    console.error("❌ Created note was not found in customer's notes list!");
    process.exit(1);
  }
  console.log("✅ Note found in database query!");
  console.log(`   Total notes for customer: ${getBody.notes.length}`);

  // 3. UPDATE NOTE (PUT)
  console.log("\n[Step 3] Updating the note...");
  const updatedTitle = `${testTitle} (Edited)`;
  const updatedContent = `${testContent} - UPDATED`;
  const updateResult = await updateNoteHandler({
    httpMethod: "PUT",
    path: `/notes/${noteId}`,
    pathParameters: { id: noteId },
    body: JSON.stringify({
      title: updatedTitle,
      content: updatedContent,
    }),
  });

  if (updateResult.statusCode !== 200) {
    console.error("❌ updateNoteHandler failed:", updateResult.statusCode, updateResult.body);
    process.exit(1);
  }

  const updateBody = JSON.parse(updateResult.body);
  console.log("✅ Note updated successfully!");
  console.log("   New Title:", updateBody.note.title);
  console.log("   New Content:", updateBody.note.content);

  // 4. VERIFY UPDATED CONTENT IN DB
  console.log("\n[Step 4] Re-fetching to confirm update persisted to DB...");
  const verifyResult = await getNotesHandler({
    httpMethod: "GET",
    path: "/notes",
    queryStringParameters: { customerId: customerUuid },
  });
  const verifyBody = JSON.parse(verifyResult.body);
  const verifiedNote = verifyBody.notes.find((n: any) => n.id === noteId);
  if (!verifiedNote || verifiedNote.title !== updatedTitle) {
    console.error("❌ Updated note content does not match DB record!");
    process.exit(1);
  }
  console.log("✅ Confirmed update persisted in database!");

  // 5. DELETE NOTE
  console.log("\n[Step 5] Deleting the note...");
  const deleteResult = await deleteNoteHandler({
    httpMethod: "DELETE",
    path: `/notes/${noteId}`,
    pathParameters: { id: noteId },
  });

  if (deleteResult.statusCode !== 200) {
    console.error("❌ deleteNoteHandler failed:", deleteResult.statusCode, deleteResult.body);
    process.exit(1);
  }
  console.log("✅ Note deleted successfully!");

  // 6. VERIFY DELETION FROM DB
  console.log("\n[Step 6] Re-fetching to confirm note was removed from DB...");
  const afterDeleteResult = await getNotesHandler({
    httpMethod: "GET",
    path: "/notes",
    queryStringParameters: { customerId: customerUuid },
  });
  const afterDeleteBody = JSON.parse(afterDeleteResult.body);
  const deletedCheck = afterDeleteBody.notes.find((n: any) => n.id === noteId);
  if (deletedCheck) {
    console.error("❌ Note still exists in DB after deletion!");
    process.exit(1);
  }
  console.log("✅ Verified note was completely removed from database!");

  console.log("\n=================================================");
  console.log("  ALL 6 STEPS PASSED: 100% REAL DB PERSISTENCE   ");
  console.log("=================================================");

  await closePool();
  process.exit(0);
}

runNotesCrudTest().catch(async (err) => {
  console.error("Unexpected error in Notes CRUD test:", err);
  await closePool();
  process.exit(1);
});
