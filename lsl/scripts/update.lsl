// string updateUrl = "https://baltimare.ran.cafe/api/lsl/baltimare";
string updateUrl = "http://ran.cafe:4845/api/lsl/baltimare"; // or horseheights
string updateSecret = "dcumwoidaksdjlkajsd";
integer updateInterval = 5;

integer currentlyThrottled = 0;

updateOnline() {
    list avatars = llGetAgentList(AGENT_LIST_REGION, []);
    integer avatarsLength = llGetListLength(avatars);

    string avatarsResult = "";

    integer i = 0;
    for (i = 0; i < avatarsLength; i++) {
        string keyStrFull = llList2String(avatars, i);
        string keyStr = llReplaceSubString(keyStrFull, "-", "", 0);

        avatarsResult += keyStr; // + ":"; no need cause above 32 bytes

        list posResult = llGetObjectDetails(llList2Key(avatars, i), [OBJECT_POS]);
        vector position = llList2Vector(posResult, 0);

        avatarsResult += (string)llFloor(position.x) + ",";
        avatarsResult += (string)llFloor(position.y);

        if (i < avatarsLength - 1) {
            avatarsResult += ";";
        }
    }

    if (avatarsLength == 0) {
        // seems like it might not send the request with an empty string
        avatarsResult = "empty";
    }

    key result = llHTTPRequest(updateUrl, [
        HTTP_METHOD, "PUT",
        HTTP_MIMETYPE, "text/plain",
        // if 110 avatars, will be around 4400 at most, so this is ok
        HTTP_BODY_MAXLENGTH, 8192,
        HTTP_CUSTOM_HEADER, "Authorization", "Bearer " + updateSecret
    ], avatarsResult);

    if (result == NULL_KEY) {
        // throttle, lets wait
        currentlyThrottled = 1;
        llSetTimerEvent(60);
        llOwnerSay("script throttled, waiting a minute");
    } else if (currentlyThrottled == 1) {
        // reset
        currentlyThrottled = 0;
        llSetTimerEvent(updateInterval);
    }
}

default
{
    state_entry()
    {
        // TODO: can we make this a cron timer?
        llSetTimerEvent(updateInterval);
        updateOnline();
    }

    timer()
    {
        updateOnline();
    }
}