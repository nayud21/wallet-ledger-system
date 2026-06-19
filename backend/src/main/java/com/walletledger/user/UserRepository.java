package com.walletledger.user;

import io.quarkus.hibernate.orm.panache.PanacheRepositoryBase;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.Optional;
import java.util.UUID;

@ApplicationScoped
public class UserRepository implements PanacheRepositoryBase<User, UUID> {

    public Optional<User> findByUsernameOrEmail(String value) {
        return find("username = ?1 or email = ?1", value).firstResultOptional();
    }

    public boolean existsByUsernameOrEmail(String username, String email) {
        return count("username = ?1 or email = ?2", username, email) > 0;
    }
}
