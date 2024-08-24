integer updateInterval = 15;
// string updateUrl = "http://hotmilk.space:4845/api/lsl/online";
string updateUrl = "https://baltimare.hotmilk.space/api/lsl/online";
string updateSecret = "dcumwoidaksdjlkajsd";

updateOnline() {
    list avatars = llGetAgentList(AGENT_LIST_REGION, []);

    string combinedHexStr = "";

    integer i = 0;
    for (i = 0; i < llGetListLength(avatars); i++) {
        string keyStrFull = llList2String(avatars, i);
        string keyStr = llReplaceSubString(keyStrFull, "-", "", 0);
        combinedHexStr += keyStr;
    }

    llHTTPRequest(updateUrl, [
        HTTP_METHOD, "PUT",
        HTTP_MIMETYPE, "text/plain",
        // if 100 avatars, will be 3200, so this is ok
        HTTP_BODY_MAXLENGTH, 4096,
        HTTP_CUSTOM_HEADER, "Authorization", "Bearer " + updateSecret
    ], combinedHexStr);
}

default
{
    state_entry()
    {
        updateOnline();
        llSetTimerEvent(updateInterval);
    }

    timer()
    {
        updateOnline();
    }
}
