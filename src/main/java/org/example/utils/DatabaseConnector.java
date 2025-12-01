package org.example.utils;

import org.springframework.jdbc.core.ColumnMapRowMapper;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;

@Component
public class DatabaseConnector {

    public Connection getConnection(String url, String username, String password) throws SQLException {
        return DriverManager.getConnection(url, username, password);
    }

    public List<Map<String, Object>> executeQuery(String url,
                                                  String username,
                                                  String password,
                                                  String sql) throws SQLException {
        return buildJdbcTemplate(url, username, password).query(sql, new ColumnMapRowMapper());
    }

    public int executeUpdate(String url,
                             String username,
                             String password,
                             String sql) throws SQLException {
        try (Connection connection = getConnection(url, username, password);
             PreparedStatement statement = connection.prepareStatement(sql)) {
            return statement.executeUpdate();
        }
    }

    public DataSource buildDataSource(String url, String username, String password) {
        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setUrl(url);
        dataSource.setUsername(username);
        dataSource.setPassword(password);
        return dataSource;
    }

    public JdbcTemplate buildJdbcTemplate(String url, String username, String password) {
        return new JdbcTemplate(buildDataSource(url, username, password));
    }
}
