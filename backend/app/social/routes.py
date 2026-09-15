import os
import secrets
from urllib.parse import urlencode

import requests
from dotenv import load_dotenv

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import JSONResponse

from google_auth_oauthlib.flow import Flow


load_dotenv()


router = APIRouter(
    prefix="/social",
    tags=["Social Media"]
)


# =====================================================
# GOOGLE / YOUTUBE SETTINGS
# =====================================================

SCOPES = [
    "https://www.googleapis.com/auth/youtube.readonly",
    "https://www.googleapis.com/auth/yt-analytics.readonly",
]

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"

YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3"

YOUTUBE_ANALYTICS_URL = (
    "https://youtubeanalytics.googleapis.com/v2/reports"
)


# =====================================================
# SIMPLE SERVER-SIDE CACHE
# =====================================================
#
# This prevents repeated searches for the same channel
# from unnecessarily using YouTube search quota.
#
# The cache exists while the FastAPI server is running.
#
# =====================================================

YOUTUBE_CHANNEL_CACHE = {}


# =====================================================
# HELPER - GOOGLE CONFIG
# =====================================================

def get_google_config():

    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")

    if not client_id:
        raise HTTPException(
            status_code=500,
            detail="GOOGLE_CLIENT_ID is not configured"
        )

    if not client_secret:
        raise HTTPException(
            status_code=500,
            detail="GOOGLE_CLIENT_SECRET is not configured"
        )

    if not redirect_uri:
        raise HTTPException(
            status_code=500,
            detail="GOOGLE_REDIRECT_URI is not configured"
        )

    return client_id, client_secret, redirect_uri


# =====================================================
# CREATE GOOGLE FLOW
# =====================================================

def create_google_flow(state=None):

    client_id, client_secret, redirect_uri = (
        get_google_config()
    )

    client_config = {
        "web": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": GOOGLE_AUTH_URL,
            "token_uri": GOOGLE_TOKEN_URL,
            "redirect_uris": [redirect_uri],
        }
    }

    flow = Flow.from_client_config(
        client_config,
        scopes=SCOPES,
        state=state,
    )

    flow.redirect_uri = redirect_uri

    return flow


# =====================================================
# SOCIAL MEDIA STATUS
# =====================================================

@router.get("/status")
def social_media_status():

    return {
        "message": "Social media integration is ready",
        "platforms": [
            "YouTube",
            "Instagram"
        ]
    }


# =====================================================
# YOUTUBE OAUTH CONNECT
# =====================================================

@router.get("/youtube/connect")
def connect_youtube():

    client_id, client_secret, redirect_uri = (
        get_google_config()
    )

    state = secrets.token_urlsafe(32)

    params = {
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "include_granted_scopes": "true",
        "prompt": "consent",
        "state": state,
    }

    authorization_url = (
        GOOGLE_AUTH_URL
        + "?"
        + urlencode(params)
    )

    response = JSONResponse(
        content={
            "authorization_url": authorization_url
        }
    )

    response.set_cookie(
        key="oauth_state",
        value=state,
        httponly=True,
        samesite="lax",
        secure=False,
        max_age=600,
    )

    return response


# =====================================================
# YOUTUBE OAUTH CALLBACK
# =====================================================

@router.get("/youtube/callback")
def youtube_callback(
    request: Request,
    code: str,
    state: str,
):

    saved_state = request.cookies.get(
        "oauth_state"
    )

    if not saved_state:

        raise HTTPException(
            status_code=400,
            detail="OAuth state cookie is missing"
        )

    if state != saved_state:

        raise HTTPException(
            status_code=400,
            detail="Invalid OAuth state"
        )

    try:

        flow = create_google_flow(
            state=state
        )

        flow.fetch_token(
            code=code
        )

    except Exception as e:

        raise HTTPException(
            status_code=400,
            detail=(
                "Google OAuth token exchange failed: "
                f"{str(e)}"
            )
        )

    credentials = flow.credentials

    response = JSONResponse(
        content={
            "message": "YouTube connected successfully",
            "has_access_token": (
                credentials.token is not None
            ),
            "has_refresh_token": (
                credentials.refresh_token is not None
            ),
            "scopes": credentials.scopes,
        }
    )

    response.delete_cookie(
        key="oauth_state"
    )

    if credentials.token:

        response.set_cookie(
            key="youtube_access_token",
            value=credentials.token,
            httponly=True,
            samesite="lax",
            secure=False,
            max_age=3600,
        )

    if credentials.refresh_token:

        response.set_cookie(
            key="youtube_refresh_token",
            value=credentials.refresh_token,
            httponly=True,
            samesite="lax",
            secure=False,
            max_age=60 * 60 * 24 * 30,
        )

    return response


# =====================================================
# GET CONNECTED YOUTUBE CHANNEL
# =====================================================

@router.get("/youtube/me")
def get_my_youtube_channel(
    request: Request,
):

    access_token = request.cookies.get(
        "youtube_access_token"
    )

    if not access_token:

        raise HTTPException(
            status_code=401,
            detail=(
                "YouTube is not connected. "
                "Please connect YouTube first."
            )
        )

    headers = {
        "Authorization": f"Bearer {access_token}"
    }

    params = {
        "part": "snippet,statistics",
        "mine": "true",
    }

    try:

        response = requests.get(
            f"{YOUTUBE_API_URL}/channels",
            headers=headers,
            params=params,
            timeout=30,
        )

    except requests.RequestException as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "YouTube API connection failed: "
                f"{str(e)}"
            )
        )

    if response.status_code != 200:

        raise HTTPException(
            status_code=response.status_code,
            detail=response.text
        )

    data = response.json()

    if not data.get("items"):

        raise HTTPException(
            status_code=404,
            detail=(
                "No YouTube channel was found "
                "for this Google account."
            )
        )

    channel = data["items"][0]

    snippet = channel.get(
        "snippet",
        {}
    )

    statistics = channel.get(
        "statistics",
        {}
    )

    return {
        "channel_id": channel.get("id"),

        "channel_name": snippet.get(
            "title"
        ),

        "description": snippet.get(
            "description"
        ),

        "thumbnail": (
            snippet
            .get("thumbnails", {})
            .get("high", {})
            .get("url")
        ),

        "subscribers": int(
            statistics.get(
                "subscriberCount",
                0
            )
        ),

        "total_views": int(
            statistics.get(
                "viewCount",
                0
            )
        ),

        "video_count": int(
            statistics.get(
                "videoCount",
                0
            )
        ),
    }


# =====================================================
# YOUTUBE AUDIENCE ANALYTICS
# =====================================================

@router.get("/youtube/audience")
def get_youtube_audience(
    request: Request,
    start_date: str = "2026-01-01",
    end_date: str = "2026-09-14",
):

    access_token = request.cookies.get(
        "youtube_access_token"
    )

    if not access_token:

        raise HTTPException(
            status_code=401,
            detail=(
                "YouTube is not connected. "
                "Please connect YouTube first."
            )
        )

    headers = {
        "Authorization": f"Bearer {access_token}"
    }

    params = {
        "ids": "channel==MINE",
        "startDate": start_date,
        "endDate": end_date,
        "metrics": (
            "views,"
            "estimatedMinutesWatched,"
            "averageViewDuration,"
            "subscribersGained,"
            "subscribersLost"
        ),
    }

    try:

        response = requests.get(
            YOUTUBE_ANALYTICS_URL,
            headers=headers,
            params=params,
            timeout=30,
        )

    except requests.RequestException as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "YouTube Analytics API connection failed: "
                f"{str(e)}"
            )
        )

    if response.status_code != 200:

        raise HTTPException(
            status_code=response.status_code,
            detail=response.text
        )

    data = response.json()

    rows = data.get(
        "rows",
        []
    )

    metrics = {}

    if rows:

        row = rows[0]

        headers_data = data.get(
            "columnHeaders",
            []
        )

        for index, header in enumerate(
            headers_data
        ):

            name = header.get(
                "name"
            )

            if index < len(row):

                metrics[name] = row[index]

    else:

        metrics = {
            "views": 0,
            "estimatedMinutesWatched": 0,
            "averageViewDuration": 0,
            "subscribersGained": 0,
            "subscribersLost": 0,
        }

    subscribers_gained = int(
        metrics.get(
            "subscribersGained",
            0
        )
    )

    subscribers_lost = int(
        metrics.get(
            "subscribersLost",
            0
        )
    )

    follower_growth = (
        subscribers_gained
        - subscribers_lost
    )

    return {

        "period": {
            "start_date": start_date,
            "end_date": end_date,
        },

        "total_followers": None,

        "new_followers": subscribers_gained,

        "followers_lost": subscribers_lost,

        "follower_growth": follower_growth,

        "views": metrics.get(
            "views",
            0
        ),

        "watch_time_minutes": metrics.get(
            "estimatedMinutesWatched",
            0
        ),

        "average_view_duration": metrics.get(
            "averageViewDuration",
            0
        ),

        "message": (
            "Audience analytics loaded from "
            "YouTube Analytics API."
        ),
    }


# =====================================================
# REAL MONTHLY PERFORMANCE
# =====================================================

@router.get("/youtube/monthly-performance")
def get_youtube_monthly_performance(
    request: Request,
    start_date: str = "2026-04-01",
    end_date: str = "2026-09-14",
):

    access_token = request.cookies.get(
        "youtube_access_token"
    )

    if not access_token:

        raise HTTPException(
            status_code=401,
            detail=(
                "YouTube is not connected. "
                "Please connect YouTube first."
            )
        )

    headers = {
        "Authorization": f"Bearer {access_token}"
    }

    params = {
        "ids": "channel==MINE",
        "startDate": start_date,
        "endDate": end_date,
        "dimensions": "month",
        "metrics": (
            "views,"
            "likes,"
            "comments,"
            "subscribersGained,"
            "subscribersLost"
        ),
        "sort": "month",
    }

    try:

        response = requests.get(
            YOUTUBE_ANALYTICS_URL,
            headers=headers,
            params=params,
            timeout=30,
        )

    except requests.RequestException as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "YouTube Analytics API connection failed: "
                f"{str(e)}"
            )
        )

    if response.status_code != 200:

        raise HTTPException(
            status_code=response.status_code,
            detail=response.text
        )

    data = response.json()

    column_headers = data.get(
        "columnHeaders",
        []
    )

    rows = data.get(
        "rows",
        []
    )

    months = []

    header_names = []

    for header in column_headers:

        header_names.append(
            header.get("name")
        )

    for row in rows:

        row_data = {}

        for index, value in enumerate(row):

            if index < len(header_names):

                row_data[
                    header_names[index]
                ] = value

        month = row_data.get(
            "month"
        )

        views = int(
            row_data.get(
                "views",
                0
            )
            or 0
        )

        likes = int(
            row_data.get(
                "likes",
                0
            )
            or 0
        )

        comments = int(
            row_data.get(
                "comments",
                0
            )
            or 0
        )

        subscribers_gained = int(
            row_data.get(
                "subscribersGained",
                0
            )
            or 0
        )

        subscribers_lost = int(
            row_data.get(
                "subscribersLost",
                0
            )
            or 0
        )

        net_subscribers = (
            subscribers_gained
            - subscribers_lost
        )

        if views > 0:

            engagement_rate = (
                (
                    likes
                    + comments
                )
                / views
            ) * 100

        else:

            engagement_rate = 0

        months.append({

            "month": month,

            "views": views,

            "likes": likes,

            "comments": comments,

            "subscribers_gained": (
                subscribers_gained
            ),

            "subscribers_lost": (
                subscribers_lost
            ),

            "net_subscribers": (
                net_subscribers
            ),

            "engagement_rate": round(
                engagement_rate,
                2
            ),

        })

    performance = []

    for index, current in enumerate(
        months
    ):

        previous = (
            months[index - 1]
            if index > 0
            else None
        )

        follower_growth = None

        if previous:

            previous_net = (
                previous[
                    "net_subscribers"
                ]
            )

            current_net = (
                current[
                    "net_subscribers"
                ]
            )

            if previous_net != 0:

                follower_growth = round(
                    (
                        (
                            current_net
                            - previous_net
                        )
                        / abs(previous_net)
                    )
                    * 100,
                    2
                )

        content_views_growth = None

        if previous:

            previous_views = (
                previous["views"]
            )

            current_views = (
                current["views"]
            )

            if previous_views > 0:

                content_views_growth = round(
                    (
                        (
                            current_views
                            - previous_views
                        )
                        / previous_views
                    )
                    * 100,
                    2
                )

        engagement_growth = None

        if previous:

            previous_engagement = (
                previous[
                    "engagement_rate"
                ]
            )

            current_engagement = (
                current[
                    "engagement_rate"
                ]
            )

            if previous_engagement != 0:

                engagement_growth = round(
                    (
                        (
                            current_engagement
                            - previous_engagement
                        )
                        / abs(
                            previous_engagement
                        )
                    )
                    * 100,
                    2
                )

        performance.append({

            "month": current[
                "month"
            ],

            "views": current[
                "views"
            ],

            "likes": current[
                "likes"
            ],

            "comments": current[
                "comments"
            ],

            "subscribers_gained": current[
                "subscribers_gained"
            ],

            "subscribers_lost": current[
                "subscribers_lost"
            ],

            "net_subscribers": current[
                "net_subscribers"
            ],

            "engagement_rate": current[
                "engagement_rate"
            ],

            "follower_growth": (
                follower_growth
            ),

            "engagement_growth": (
                engagement_growth
            ),

            "content_views_growth": (
                content_views_growth
            ),

        })

    return {

        "creator": "connected_youtube_channel",

        "period": {
            "start_date": start_date,
            "end_date": end_date,
        },

        "months": performance,

        "message": (
            "Monthly performance loaded from "
            "YouTube Analytics API for the "
            "connected YouTube channel."
        ),

    }


# =====================================================
# YOUTUBE AUDIENCE AGE
# =====================================================

@router.get("/youtube/audience/age")
def get_youtube_audience_age(
    request: Request,
    start_date: str = "2026-01-01",
    end_date: str = "2026-09-14",
):

    return get_youtube_dimension_report(
        request=request,
        start_date=start_date,
        end_date=end_date,
        dimensions="ageGroup",
        metrics="viewerPercentage",
    )


# =====================================================
# YOUTUBE AUDIENCE GENDER
# =====================================================

@router.get("/youtube/audience/gender")
def get_youtube_audience_gender(
    request: Request,
    start_date: str = "2026-01-01",
    end_date: str = "2026-09-14",
):

    return get_youtube_dimension_report(
        request=request,
        start_date=start_date,
        end_date=end_date,
        dimensions="gender",
        metrics="viewerPercentage",
    )


# =====================================================
# YOUTUBE AUDIENCE COUNTRY
# =====================================================

@router.get("/youtube/audience/country")
def get_youtube_audience_country(
    request: Request,
    start_date: str = "2026-01-01",
    end_date: str = "2026-09-14",
):

    return get_youtube_dimension_report(
        request=request,
        start_date=start_date,
        end_date=end_date,
        dimensions="country",
        metrics="viewerPercentage",
    )


# =====================================================
# GENERIC YOUTUBE DIMENSION REPORT
# =====================================================

def get_youtube_dimension_report(
    request: Request,
    start_date: str,
    end_date: str,
    dimensions: str,
    metrics: str,
):

    access_token = request.cookies.get(
        "youtube_access_token"
    )

    if not access_token:

        raise HTTPException(
            status_code=401,
            detail=(
                "YouTube is not connected. "
                "Please connect YouTube first."
            )
        )

    headers = {
        "Authorization": f"Bearer {access_token}"
    }

    params = {
        "ids": "channel==MINE",
        "startDate": start_date,
        "endDate": end_date,
        "dimensions": dimensions,
        "metrics": metrics,
        "sort": f"-{metrics}",
    }

    try:

        response = requests.get(
            YOUTUBE_ANALYTICS_URL,
            headers=headers,
            params=params,
            timeout=30,
        )

    except requests.RequestException as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "YouTube Analytics API connection failed: "
                f"{str(e)}"
            )
        )

    if response.status_code != 200:

        raise HTTPException(
            status_code=response.status_code,
            detail=response.text
        )

    data = response.json()

    return {

        "dimension": dimensions,

        "metrics": metrics,

        "column_headers": data.get(
            "columnHeaders",
            []
        ),

        "rows": data.get(
            "rows",
            []
        ),
    }


# =====================================================
# ANALYZE PUBLIC YOUTUBE CHANNEL
# =====================================================

@router.get("/youtube/analyze")
def analyze_youtube_channel(
    channel_name: str
):

    api_key = os.getenv(
        "YOUTUBE_API_KEY"
    )

    if not api_key:

        raise HTTPException(
            status_code=500,
            detail=(
                "YOUTUBE_API_KEY is not configured"
            )
        )

    search_name = channel_name.strip()

    if not search_name:

        raise HTTPException(
            status_code=400,
            detail=(
                "Please enter a YouTube channel name."
            )
        )

    # =================================================
    # CHECK SERVER-SIDE CACHE
    # =================================================

    cache_key = search_name.lower()

    if cache_key in YOUTUBE_CHANNEL_CACHE:

        print(
            f"Using cached YouTube data for: "
            f"{search_name}"
        )

        return YOUTUBE_CHANNEL_CACHE[
            cache_key
        ]

    # =================================================
    # SEARCH CHANNEL
    # =================================================
    #
    # THIS IS NOW THE ONLY search.list CALL
    # IN THIS ENDPOINT.
    #
    # =================================================

    search_params = {

        "part": "snippet",

        "q": search_name,

        "type": "channel",

        "maxResults": 1,

        "key": api_key,
    }

    try:

        search_response = requests.get(
            f"{YOUTUBE_API_URL}/search",
            params=search_params,
            timeout=30,
        )

    except requests.RequestException as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "YouTube API connection failed: "
                f"{str(e)}"
            )
        )

    if search_response.status_code != 200:

        # =================================================
        # FRIENDLY QUOTA ERROR
        # =================================================

        if search_response.status_code == 429:

            raise HTTPException(
                status_code=429,
                detail=(
                    "YouTube search quota has been "
                    "exceeded for today. Please try "
                    "again after the YouTube API quota "
                    "resets."
                )
            )

        raise HTTPException(
            status_code=search_response.status_code,
            detail=search_response.text
        )

    search_data = search_response.json()

    if not search_data.get("items"):

        raise HTTPException(
            status_code=404,
            detail=(
                f"No YouTube channel found "
                f"for '{search_name}'."
            )
        )

    channel_id = (
        search_data["items"][0]
        .get("id", {})
        .get("channelId")
    )

    if not channel_id:

        raise HTTPException(
            status_code=404,
            detail=(
                "YouTube channel ID could not "
                "be found."
            )
        )

    # =================================================
    # GET CHANNEL INFORMATION
    # =================================================

    channel_params = {

        "part": "snippet,statistics,contentDetails",

        "id": channel_id,

        "key": api_key,
    }

    try:

        channel_response = requests.get(
            f"{YOUTUBE_API_URL}/channels",
            params=channel_params,
            timeout=30,
        )

    except requests.RequestException as e:

        raise HTTPException(
            status_code=500,
            detail=(
                "YouTube API connection failed: "
                f"{str(e)}"
            )
        )

    if channel_response.status_code != 200:

        raise HTTPException(
            status_code=channel_response.status_code,
            detail=channel_response.text
        )

    channel_data = channel_response.json()

    if not channel_data.get("items"):

        raise HTTPException(
            status_code=404,
            detail="YouTube channel not found."
        )

    channel = channel_data["items"][0]

    snippet = channel.get(
        "snippet",
        {}
    )

    statistics = channel.get(
        "statistics",
        {}
    )

    content_details = channel.get(
        "contentDetails",
        {}
    )

    # =================================================
    # GET UPLOADS PLAYLIST ID
    # =================================================

    related_playlists = (
        content_details.get(
            "relatedPlaylists",
            {}
        )
    )

    uploads_playlist_id = (
        related_playlists.get(
            "uploads"
        )
    )

    # =================================================
    # GET RECENT VIDEOS
    # =================================================
    #
    # IMPORTANT:
    #
    # We DO NOT use search.list here.
    #
    # We use playlistItems.list instead.
    #
    # This saves one expensive search.list call.
    #
    # =================================================

    video_ids = []

    if uploads_playlist_id:

        playlist_params = {

            "part": "snippet",

            "playlistId": uploads_playlist_id,

            "maxResults": 10,

            "key": api_key,
        }

        try:

            playlist_response = requests.get(
                f"{YOUTUBE_API_URL}/playlistItems",
                params=playlist_params,
                timeout=30,
            )

        except requests.RequestException as e:

            raise HTTPException(
                status_code=500,
                detail=(
                    "YouTube API connection failed: "
                    f"{str(e)}"
                )
            )

        if playlist_response.status_code != 200:

            raise HTTPException(
                status_code=(
                    playlist_response.status_code
                ),
                detail=playlist_response.text
            )

        playlist_data = (
            playlist_response.json()
        )

        for item in playlist_data.get(
            "items",
            []
        ):

            resource_id = (
                item
                .get("snippet", {})
                .get("resourceId", {})
            )

            video_id = resource_id.get(
                "videoId"
            )

            if video_id:

                video_ids.append(
                    video_id
                )

    # =================================================
    # GET VIDEO STATISTICS
    # =================================================

    videos = []

    if video_ids:

        videos_params = {

            "part": "snippet,statistics",

            "id": ",".join(video_ids),

            "key": api_key,
        }

        try:

            videos_response = requests.get(
                f"{YOUTUBE_API_URL}/videos",
                params=videos_params,
                timeout=30,
            )

        except requests.RequestException as e:

            raise HTTPException(
                status_code=500,
                detail=(
                    "YouTube API connection failed: "
                    f"{str(e)}"
                )
            )

        if videos_response.status_code != 200:

            raise HTTPException(
                status_code=(
                    videos_response.status_code
                ),
                detail=videos_response.text
            )

        videos_data = (
            videos_response.json()
        )

        for video in videos_data.get(
            "items",
            []
        ):

            video_snippet = video.get(
                "snippet",
                {}
            )

            video_statistics = video.get(
                "statistics",
                {}
            )

            videos.append({

                "video_id": video.get(
                    "id"
                ),

                "title": video_snippet.get(
                    "title"
                ),

                "published_at": (
                    video_snippet.get(
                        "publishedAt"
                    )
                ),

                "views": int(
                    video_statistics.get(
                        "viewCount",
                        0
                    )
                ),

                "likes": int(
                    video_statistics.get(
                        "likeCount",
                        0
                    )
                ),

                "comments": int(
                    video_statistics.get(
                        "commentCount",
                        0
                    )
                ),

            })

    # =================================================
    # CALCULATE ANALYTICS
    # =================================================

    total_video_views = sum(
        video["views"]
        for video in videos
    )

    total_likes = sum(
        video["likes"]
        for video in videos
    )

    total_comments = sum(
        video["comments"]
        for video in videos
    )

    if total_video_views > 0:

        engagement_rate = (
            (
                total_likes
                + total_comments
            )
            / total_video_views
        ) * 100

    else:

        engagement_rate = 0

    # =================================================
    # RETURN DATA
    # =================================================

    result = {

        "channel": {

            "channel_id": channel.get(
                "id"
            ),

            "channel_name": snippet.get(
                "title"
            ),

            "description": snippet.get(
                "description"
            ),

            "thumbnail": (
                snippet
                .get("thumbnails", {})
                .get("high", {})
                .get("url")
            ),

            "subscribers": int(
                statistics.get(
                    "subscriberCount",
                    0
                )
            ),

            "total_views": int(
                statistics.get(
                    "viewCount",
                    0
                )
            ),

            "video_count": int(
                statistics.get(
                    "videoCount",
                    0
                )
            ),

        },

        "analytics": {

            "recent_video_views": (
                total_video_views
            ),

            "recent_video_likes": (
                total_likes
            ),

            "recent_video_comments": (
                total_comments
            ),

            "engagement_rate": round(
                engagement_rate,
                2
            ),

        },

        "recent_videos": videos,

    }

    # =================================================
    # SAVE RESULT TO SERVER CACHE
    # =================================================

    YOUTUBE_CHANNEL_CACHE[
        cache_key
    ] = result

    return result