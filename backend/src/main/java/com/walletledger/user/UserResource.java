package com.walletledger.user;

import com.walletledger.user.dto.CreateUserRequest;
import com.walletledger.user.dto.UserResponse;
import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import lombok.RequiredArgsConstructor;
import java.util.UUID;

@Path("/api/v1/users")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
@RequiredArgsConstructor
public class UserResource {

    private final UserRepository userRepo;

    @POST
    @Transactional
    public Response create(@Valid CreateUserRequest req) {
        User user = new User();
        user.username = req.username();
        user.email = req.email();
        userRepo.persist(user);
        return Response.status(Response.Status.CREATED).entity(UserResponse.from(user)).build();
    }

    @GET
    @Path("/{id}")
    public UserResponse get(@PathParam("id") UUID id) {
        return userRepo.findByIdOptional(id)
            .map(UserResponse::from)
            .orElseThrow(() -> new NotFoundException("User not found: " + id));
    }
}
