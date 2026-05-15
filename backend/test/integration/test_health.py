async def test_app_is_running(ac):
    response = await ac.get("/")
    # just checking the app responds at all
    assert response.status_code != 500
