import React from "react";
import { useParams } from "react-router-dom";
import Journal from "../components/Journal";

const JournalPage = ({ aiResponses, hasAnimatedRef, userData }) => {
  const { journalId } = useParams();
  return (
    <Journal
      userData={userData}
      aiResponses={aiResponses}
      hasAnimatedRef={hasAnimatedRef}
      initialJournalId={journalId || null}
    />
  );
};

export default JournalPage;
