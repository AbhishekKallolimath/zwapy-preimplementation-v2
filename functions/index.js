const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();

// Triggers when a new post is added to any club
exports.notifyClubMembers = functions.firestore
  .document("clubs/{clubId}/posts/{postId}")
  .onCreate(async (snap, context) => {
    const post    = snap.data();
    const clubId  = context.params.clubId;

    // Get club doc to find members
    const clubDoc = await admin.firestore()
      .collection("clubs").doc(clubId).get();
    if(!clubDoc.exists) return null;

    const club    = clubDoc.data();
    const members = club.members || [];
    if(!members.length) return null;

    // Get FCM tokens of all members
    const tokens = [];
    for(const uid of members){
      const userDoc = await admin.firestore()
        .collection("users").doc(uid).get();
      if(userDoc.exists){
        const fcmToken = userDoc.data().fcmToken;
        if(fcmToken) tokens.push(fcmToken);
      }
    }
    if(!tokens.length) return null;

    // Send notification
    const message = {
      notification: {
        title: `📅 ${club.name}`,
        body: `New ${post.type||'event'}: ${post.title||'Check it out!'}`
      },
      data: {
        clubId,
        postId: context.params.postId,
        type: post.type || 'event'
      },
      tokens
    };

    const response = await admin.messaging().sendMulticast(message);
    console.log(`Sent to ${response.successCount} devices`);
    return null;
  });