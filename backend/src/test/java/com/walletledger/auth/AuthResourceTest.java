package com.walletledger.auth;

import io.quarkus.narayana.jta.QuarkusTransaction;
import io.quarkus.test.junit.QuarkusTest;
import io.restassured.http.ContentType;
import jakarta.inject.Inject;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.*;

@QuarkusTest
class AuthResourceTest {

    @Inject
    EntityManager em;

    @BeforeEach
    @Transactional
    void cleanup() {
        em.createNativeQuery("DELETE FROM users WHERE email LIKE 'auth-%@example.com'").executeUpdate();
    }

    private String registerBody(String username, String email, String password) {
        return """
            {"username":"%s","email":"%s","password":"%s"}
            """.formatted(username, email, password);
    }

    @Test
    void register_returns201_andNoPasswordHashLeak() {
        given().contentType(ContentType.JSON)
            .body(registerBody("authalice", "auth-alice@example.com", "secret12345"))
        .when()
            .post("/api/v1/auth/register")
        .then()
            .statusCode(201)
            .body("accessToken", not(emptyOrNullString()))
            .body("tokenType", equalTo("Bearer"))
            .body("passwordHash", nullValue())
            .body("password", nullValue());
    }

    @Test
    void register_duplicate_returns409() {
        String body = registerBody("authbob", "auth-bob@example.com", "secret12345");
        given().contentType(ContentType.JSON).body(body)
            .post("/api/v1/auth/register").then().statusCode(201);

        given().contentType(ContentType.JSON).body(body)
            .when().post("/api/v1/auth/register")
            .then().statusCode(409);
    }

    @Test
    void login_correctCredentials_returnsToken() {
        given().contentType(ContentType.JSON)
            .body(registerBody("authcarol", "auth-carol@example.com", "secret12345"))
            .post("/api/v1/auth/register").then().statusCode(201);

        given().contentType(ContentType.JSON)
            .body("""
                {"usernameOrEmail":"auth-carol@example.com","password":"secret12345"}
                """)
        .when()
            .post("/api/v1/auth/login")
        .then()
            .statusCode(200)
            .body("accessToken", not(emptyOrNullString()));
    }

    @Test
    void login_wrongPassword_returns401() {
        given().contentType(ContentType.JSON)
            .body(registerBody("authdan", "auth-dan@example.com", "secret12345"))
            .post("/api/v1/auth/register").then().statusCode(201);

        given().contentType(ContentType.JSON)
            .body("""
                {"usernameOrEmail":"auth-dan@example.com","password":"wrongpassword"}
                """)
        .when()
            .post("/api/v1/auth/login")
        .then()
            .statusCode(401);
    }

    @Test
    void login_unknownUser_returns401() {
        given().contentType(ContentType.JSON)
            .body("""
                {"usernameOrEmail":"auth-nobody@example.com","password":"secret12345"}
                """)
        .when()
            .post("/api/v1/auth/login")
        .then()
            .statusCode(401);
    }

    @Test
    void login_suspendedAccount_returns403() {
        given().contentType(ContentType.JSON)
            .body(registerBody("autheve", "auth-eve@example.com", "secret12345"))
            .post("/api/v1/auth/register").then().statusCode(201);

        QuarkusTransaction.requiringNew().run(() ->
            em.createNativeQuery("UPDATE users SET status = 'SUSPENDED' WHERE email = 'auth-eve@example.com'")
                .executeUpdate());

        given().contentType(ContentType.JSON)
            .body("""
                {"usernameOrEmail":"auth-eve@example.com","password":"secret12345"}
                """)
        .when()
            .post("/api/v1/auth/login")
        .then()
            .statusCode(403);
    }

    @Test
    void login_userWithNullPasswordHash_returns401() {
        QuarkusTransaction.requiringNew().run(() ->
            em.createNativeQuery(
                    "INSERT INTO users (username, email) VALUES ('authghost', 'auth-ghost@example.com')")
                .executeUpdate());

        given().contentType(ContentType.JSON)
            .body("""
                {"usernameOrEmail":"auth-ghost@example.com","password":"anything12345"}
                """)
        .when()
            .post("/api/v1/auth/login")
        .then()
            .statusCode(401);
    }

    @Test
    void me_withToken_returnsIdentity() {
        String token = given().contentType(ContentType.JSON)
            .body(registerBody("authfrank", "auth-frank@example.com", "secret12345"))
            .post("/api/v1/auth/register")
            .then().statusCode(201)
            .extract().path("accessToken");

        given().header("Authorization", "Bearer " + token)
        .when()
            .get("/api/v1/auth/me")
        .then()
            .statusCode(200)
            .body("username", equalTo("authfrank"))
            .body("email", equalTo("auth-frank@example.com"))
            .body("role", equalTo("USER"));
    }

    @Test
    void me_withoutToken_returns401() {
        given()
        .when()
            .get("/api/v1/auth/me")
        .then()
            .statusCode(401);
    }
}
