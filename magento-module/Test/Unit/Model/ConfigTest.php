<?php
declare(strict_types=1);

namespace Herqua\Schoenadviseur\Test\Unit\Model;

use Herqua\Schoenadviseur\Model\Config;
use Magento\Framework\App\Config\ScopeConfigInterface;
use Magento\Framework\Encryption\EncryptorInterface;
use PHPUnit\Framework\TestCase;

final class ConfigTest extends TestCase
{
    public function testIsEnabledReadsFromScopeConfig(): void
    {
        $scope = $this->createMock(ScopeConfigInterface::class);
        $scope->method('isSetFlag')
            ->with('herqua_schoenadviseur/general/enabled')
            ->willReturn(true);
        $encryptor = $this->createMock(EncryptorInterface::class);

        $config = new Config($scope, $encryptor);
        $this->assertTrue($config->isEnabled());
    }

    public function testGetDataSourceDefault(): void
    {
        $scope = $this->createMock(ScopeConfigInterface::class);
        $scope->method('getValue')
            ->with('herqua_schoenadviseur/general/data_source')
            ->willReturn('scraping');
        $encryptor = $this->createMock(EncryptorInterface::class);

        $config = new Config($scope, $encryptor);
        $this->assertSame('scraping', $config->getDataSource());
    }

    public function testGetBackendTokenDecrypts(): void
    {
        $scope = $this->createMock(ScopeConfigInterface::class);
        $scope->method('getValue')
            ->with('herqua_schoenadviseur/backend/auth_token')
            ->willReturn('ENCRYPTED:abc');
        $encryptor = $this->createMock(EncryptorInterface::class);
        $encryptor->method('decrypt')
            ->with('ENCRYPTED:abc')
            ->willReturn('secret-token');

        $config = new Config($scope, $encryptor);
        $this->assertSame('secret-token', $config->getBackendToken());
    }
}
